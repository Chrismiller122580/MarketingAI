import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireAvatarWorldAdmin } from "@/lib/auth-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { foundTown, quickCreateResidents } from "@/lib/viraforge/world-life";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const spawnSchema = z.object({
  name: z.string().trim().max(80).optional(),
  occupation: z.string().trim().max(80).optional(),
  location: z.string().trim().max(120).optional(),
  gender: z.enum(["female", "male", "nonbinary"]).optional(),
  vibe: z.string().trim().max(240).optional(),
  count: z.number().int().min(1).max(5).optional(),
  welcome: z.boolean().optional(),
  foundTown: z.boolean().optional(),
  withFace: z.boolean().optional(),
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
    const parsed = spawnSchema.safeParse(body);
    const hint = parsed.success ? parsed.data : {};

    if (hint.foundTown) {
      const result = await foundTown(authResult);
      const first = result.created[0];
      return NextResponse.json({
        ...first,
        created: result.created,
        remaining: result.remaining,
        count: result.created.length,
        alreadyFounded: result.alreadyFounded,
        missing: result.missing,
        listings: result.listings,
        foundTown: true,
      });
    }

    const result = await quickCreateResidents(authResult, hint);
    const first = result.created[0];
    return NextResponse.json({
      ...first,
      created: result.created,
      remaining: result.remaining,
      count: result.created.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not invite a resident";
    const status = message.includes("full") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
