import { NextResponse } from "next/server";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { spawnDiverseResident } from "@/lib/viraforge/world-life";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  const rl = checkRateLimit(authResult, "generate");
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: `Rate limit exceeded. Retry in ~${rl.retryAfterSeconds}s.`,
        retryAfter: rl.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  try {
    const result = await spawnDiverseResident(authResult);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not invite a resident";
    const status = message.includes("full") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
