import { NextRequest, NextResponse } from "next/server";
import { redis, KEYS } from "@/lib/redis";
import { TEAM_OPTIONS } from "@/lib/types";
import { requireAdmin } from "@/lib/auth";

const VALID_TEAM_IDS = new Set(TEAM_OPTIONS.map((t) => t.id));

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const exists = await redis.hexists(KEYS.names, id);
  if (!exists) {
    return NextResponse.json({ error: "Participant not found." }, { status: 404 });
  }

  let newScore: number | undefined;
  if (body?.delta !== undefined) {
    const delta = Number(body.delta);
    if (!Number.isFinite(delta) || delta === 0) {
      return NextResponse.json({ error: "A non-zero numeric delta is required." }, { status: 400 });
    }
    if (Math.abs(delta) > 1000) {
      return NextResponse.json({ error: "Delta is too large." }, { status: 400 });
    }
    newScore = await redis.zincrby(KEYS.scores, delta, id);
  }

  if (body?.team !== undefined) {
    const team = body.team;
    if (team === "" || VALID_TEAM_IDS.has(team)) {
      if (team === "") {
        await redis.hdel(KEYS.teams, id);
      } else {
        await redis.hset(KEYS.teams, { [id]: team });
      }
    } else {
      return NextResponse.json({ error: "Invalid team." }, { status: 400 });
    }
  }

  return NextResponse.json({ id, score: newScore });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  await redis.zrem(KEYS.scores, id);
  await redis.hdel(KEYS.names, id);
  await redis.hdel(KEYS.teams, id);
  return NextResponse.json({ ok: true });
}
