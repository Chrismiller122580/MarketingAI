import { NextResponse } from "next/server";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import {
  type CreatorEventType,
  recordCreatorEvent,
} from "@/lib/viraforge/learning";

const ALLOWED: CreatorEventType[] = [
  "field_edit",
  "approve_quote",
  "reject_quote",
  "regenerate",
];

export async function POST(request: Request) {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await request.json();
    const eventType = body.eventType as CreatorEventType;

    if (!ALLOWED.includes(eventType)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    await recordCreatorEvent(
      authResult,
      eventType,
      body.payload ?? {},
      body.influencerId,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Event failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}