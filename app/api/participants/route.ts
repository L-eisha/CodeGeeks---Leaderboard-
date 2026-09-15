import { NextRequest, NextResponse } from "next/server";
import { redis, KEYS } from "@/lib/redis";
import { Participant, TEAM_OPTIONS } from "@/lib/types";
import { getAdminKey, requireAdmin } from "@/lib/auth";

const VALID_TEAM_IDS = new Set(TEAM_OPTIONS.map((t) => t.id));
const MAX_BULK = 300;
const MAX_NAME_LEN = 50;

function makeId(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${slug || "p"}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanTeam(team: unknown): string {
  return typeof team === "string" && VALID_TEAM_IDS.has(team) ? team : "";
}

export async function GET(req: NextRequest) {
  const raw = await redis.zrange(KEYS.scores, 0, -1, {
    withScores: true,
    rev: true,
  });

  const ids: string[] = [];
  const scores: number[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    ids.push(raw[i] as string);
    scores.push(Number(raw[i + 1]));
  }

  const names = ids.length ? await redis.hmget(KEYS.names, ...ids) : {};
  const teams = ids.length ? await redis.hmget(KEYS.teams, ...ids) : {};

  const participants: Participant[] = ids.map((id, i) => ({
    id,
    name: (names as Record<string, string>)?.[id] ?? id,
    team: (teams as Record<string, string>)?.[id] ?? "",
    score: scores[i],
  }));

  return NextResponse.json({
    participants,
    canEdit: Boolean(getAdminKey()) && req.headers.get("x-admin-key") === getAdminKey(),
  });
}

export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => null);

  // Bulk add: { names: string[], team?: string }
  if (Array.isArray(body?.names)) {
    const rawNames: unknown[] = body.names;
    const team = cleanTeam(body?.team);

    const cleanNames = rawNames
      .filter((n): n is string => typeof n === "string")
      .map((n) => n.trim())
      .filter((n) => n.length > 0 && n.length <= MAX_NAME_LEN);

    if (cleanNames.length === 0) {
      return NextResponse.json({ error: "No valid names provided." }, { status: 400 });
    }
    if (cleanNames.length > MAX_BULK) {
      return NextResponse.json(
        { error: `Please add at most ${MAX_BULK} names at once.` },
        { status: 400 }
      );
    }

    const pipeline = redis.pipeline();
    const created: Participant[] = [];
    for (const name of cleanNames) {
      const id = makeId(name);
      pipeline.zadd(KEYS.scores, { score: 0, member: id });
      pipeline.hset(KEYS.names, { [id]: name });
      if (team) pipeline.hset(KEYS.teams, { [id]: team });
      created.push({ id, name, team, score: 0 });
    }
    await pipeline.exec();

    return NextResponse.json({ participants: created }, { status: 201 });
  }

  // Single add: { name: string, team?: string }
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "A name is required." }, { status: 400 });
  }
  if (name.length > MAX_NAME_LEN) {
    return NextResponse.json({ error: "Name is too long." }, { status: 400 });
  }

  const team = cleanTeam(body?.team);
  const id = makeId(name);
  await redis.zadd(KEYS.scores, { score: 0, member: id });
  await redis.hset(KEYS.names, { [id]: name });
  if (team) await redis.hset(KEYS.teams, { [id]: team });

  const participant: Participant = { id, name, score: 0, team };
  return NextResponse.json({ participant }, { status: 201 });
}
