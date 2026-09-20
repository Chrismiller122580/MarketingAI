import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireAvatarWorldAdmin } from "@/lib/auth-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { liveWorldDay } from "@/lib/viraforge/world-life";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const liveSchema = z.object({
  force: z.boolean().optional(),
});

export async function POST(request: Request) {
  const authResult = await requireAvatarWorldAdmin();
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
    const body = await request.json().catch(() => ({}));
    const parsed = liveSchema.safeParse(body);
    const force = parsed.success ? parsed.data.force === true : false;

    const result = await liveWorldDay({
      userId: authResult,
      force,
    });

    if (result.skipped && result.reason === "empty") {
      return NextResponse.json(
        { error: "Invite a resident first", ...result },
        { status: 400 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The world could not live today";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
