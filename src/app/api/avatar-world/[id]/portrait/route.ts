import { NextResponse } from "next/server";
import { isAuthError, requireAvatarWorldAdmin } from "@/lib/auth-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { paintResidentFace } from "@/lib/viraforge/world-life";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
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
    const { id } = await context.params;
    const painted = await paintResidentFace(authResult, id);
    if (!painted) {
      return NextResponse.json(
        { error: "Could not paint a face. Try again in a moment." },
        { status: 503 },
      );
    }
    return NextResponse.json(painted);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not paint a face";
    const status = message.includes("aren't available") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
