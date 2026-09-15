import { NextRequest, NextResponse } from "next/server";

const localAdminKey = "codegeeks-local-admin";

export function getAdminKey() {
  return process.env.LEADERBOARD_ADMIN_KEY || (process.env.NODE_ENV === "development" ? localAdminKey : "");
}

export function requireAdmin(req: NextRequest) {
  const configuredKey = getAdminKey();
  const providedKey = req.headers.get("x-admin-key");

  if (!configuredKey || providedKey !== configuredKey) {
    return NextResponse.json({ error: "Editor access required." }, { status: 401 });
  }

  return null;
}
