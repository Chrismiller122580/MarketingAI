import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { contributeToWorldPost } from "@/lib/viraforge/avatar-world";

const contributeSchema = z.object({
  postId: z.string().min(1),
  contributorId: z.string().min(1).optional(),
  brief: z.string().max(500).optional(),
  auto: z.boolean().optional(),
});

export async function POST(request: Request) {
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
    const parsed = contributeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Pick a post to build on" },
        { status: 400 },
      );
    }

    const result = await contributeToWorldPost({
      userId: authResult,
      postId: parsed.data.postId,
      contributorId: parsed.data.contributorId,
      brief: parsed.data.brief,
      auto: parsed.data.auto,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not add to that post";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
