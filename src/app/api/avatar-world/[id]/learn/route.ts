import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { learnFromAvatar } from "@/lib/viraforge/avatar-world";

type RouteContext = { params: Promise<{ id: string }> };

const learnSchema = z.object({
  fromInfluencerId: z.string().min(1),
});

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  try {
    const { id } = await context.params;
    const parsed = learnSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Pick an avatar to learn from" }, { status: 400 });
    }

    const result = await learnFromAvatar({
      userId: authResult,
      learnerId: id,
      teacherId: parsed.data.fromInfluencerId,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not learn from that avatar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
