import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasReplicate } from "@/lib/replicate-client";
import { hasElevenLabs } from "@/lib/viraforge/elevenlabs";
import { isEnterprisePlusPlan } from "@/lib/plans";

export async function GET() {
  const session = await auth();
  const plan = session?.user?.plan;
  const isAdmin = session?.user?.role === "admin";

  return NextResponse.json({
    motionVideoAvailable: hasReplicate(),
    voiceAvailable: hasElevenLabs(),
    motionTypes: {
      "walk-talk": hasReplicate() && hasElevenLabs(),
      talk: hasReplicate() && hasElevenLabs(),
      walk: hasReplicate(),
      spin: hasReplicate(),
      jump: hasReplicate(),
      wave: hasReplicate(),
      point: hasReplicate(),
    },
    siteContentAvailable: isAdmin || isEnterprisePlusPlan(plan),
  });
}
