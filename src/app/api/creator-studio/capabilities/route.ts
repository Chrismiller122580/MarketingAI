import { NextResponse } from "next/server";
import { hasReplicate } from "@/lib/replicate-client";
import { hasElevenLabs } from "@/lib/viraforge/elevenlabs";

export async function GET() {
  return NextResponse.json({
    motionVideoAvailable: hasReplicate(),
    voiceAvailable: hasElevenLabs(),
    motionTypes: {
      talk: hasReplicate() && hasElevenLabs(),
      walk: hasReplicate(),
      spin: hasReplicate(),
      jump: hasReplicate(),
    },
  });
}