import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import {
  loadWorldDetail,
  patchWorldProfile,
} from "@/lib/viraforge/avatar-world";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  const { id } = await context.params;
  const detail = await loadWorldDetail(authResult, id);
  if (!detail) {
    return NextResponse.json({ error: "Avatar not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

const patchSchema = z.object({
  bio: z.string().max(280).optional(),
  backstory: z.string().max(2000).optional(),
  occupation: z.string().max(80).optional(),
  hometown: z.string().max(120).optional(),
  currentCity: z.string().max(120).optional(),
  relationshipStatus: z.string().max(80).optional(),
  values: z.array(z.string().min(1).max(40)).max(8).optional(),
  goals: z.array(z.string().min(1).max(80)).max(8).optional(),
  interests: z.array(z.string().min(1).max(40)).max(10).optional(),
  mood: z.string().max(40).optional(),
  moodNote: z.string().max(200).optional(),
  catchphrase: z.string().max(200).optional(),
  isPublic: z.boolean().optional(),
});

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid profile", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const world = await patchWorldProfile(authResult, id, parsed.data);
    if (!world) {
      return NextResponse.json({ error: "Avatar not found" }, { status: 404 });
    }
    return NextResponse.json({ world });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
