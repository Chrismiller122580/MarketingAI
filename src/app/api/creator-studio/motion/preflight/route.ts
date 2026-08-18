import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { hasReplicate } from "@/lib/replicate-client";
import { hasElevenLabs } from "@/lib/viraforge/elevenlabs";
import type { InfluencerAssets } from "@/lib/viraforge/influencer-assets";
import { validateQuoteAgainstFacts } from "@/lib/viraforge/claim-validator";
import { factsFromRecord, hasLockedProductFacts } from "@/lib/schemas/product-facts-schema";
import {
  analyzeTalkScript,
  hashTalkScript,
  type TalkCheckStatus,
} from "@/lib/viraforge/talk-settings";

const preflightSchema = z.object({
  influencerId: z.string().min(1),
  script: z.string().max(500),
  approvedScriptHash: z.string().max(32).optional(),
});

type CheckItem = {
  id: string;
  label: string;
  status: TalkCheckStatus;
  detail?: string;
};

export async function POST(request: Request) {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await request.json();
    const parsed = preflightSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { influencerId, script, approvedScriptHash } = parsed.data;
    const analysis = analyzeTalkScript(script);
    const checks: CheckItem[] = [];

    const replicateOk = hasReplicate();
    checks.push({
      id: "replicate",
      label: "Replicate (lip-sync video)",
      status: replicateOk ? "pass" : "fail",
      detail: replicateOk
        ? "REPLICATE_API_TOKEN configured"
        : "Add REPLICATE_API_TOKEN in Settings → Integrations",
    });

    const elevenOk = hasElevenLabs();
    checks.push({
      id: "elevenlabs",
      label: "ElevenLabs (voice)",
      status: elevenOk ? "pass" : "fail",
      detail: elevenOk
        ? "ELEVENLABS_API_KEY configured"
        : "Add ELEVENLABS_API_KEY in Settings → Integrations",
    });

    const influencer = await prisma.influencer.findFirst({
      where: { id: influencerId, userId: authResult },
      include: { productFacts: true },
    });

    if (!influencer) {
      return NextResponse.json({ error: "Influencer not found" }, { status: 404 });
    }

    const assets = (influencer.assets ?? {}) as InfluencerAssets;
    const portraitOk = !!assets.portraitUrl;
    checks.push({
      id: "portrait",
      label: "Saved portrait",
      status: portraitOk ? "pass" : "fail",
      detail: portraitOk
        ? "Portrait ready for lip-sync"
        : "Generate and save a portrait first",
    });

    checks.push({
      id: "script_length",
      label: `Script length (${analysis.wordCount} words)`,
      status: analysis.lengthStatus,
      detail: analysis.messages.find((m) => m.includes("word")) ?? undefined,
    });

    checks.push({
      id: "duration",
      label: `Estimated duration (~${analysis.estimatedDurationSec}s)`,
      status: analysis.durationStatus,
      detail:
        analysis.messages.find((m) => m.includes("Estimated")) ?? undefined,
    });

    const facts = factsFromRecord(influencer.productFacts);
    const quoteCheck = validateQuoteAgainstFacts(analysis.script, facts);
    checks.push({
      id: "facts",
      label: "Fact-locked claims",
      status: quoteCheck.valid ? "pass" : "fail",
      detail: quoteCheck.valid
        ? hasLockedProductFacts(facts)
          ? "Script matches verified product facts"
          : "No facts locked — scripts stay general"
        : quoteCheck.violations.join("; "),
    });

    const previewApproved =
      !!approvedScriptHash && approvedScriptHash === analysis.scriptHash;
    checks.push({
      id: "voice_preview",
      label: "Voice preview approved",
      status: previewApproved ? "pass" : "fail",
      detail: previewApproved
        ? "Preview matches current script — ready to render"
        : "Preview voice and approve before rendering Talk",
    });

    const hasFail = checks.some((c) => c.status === "fail");
    const canRender =
      !hasFail &&
      replicateOk &&
      elevenOk &&
      portraitOk &&
      analysis.canRender &&
      previewApproved;

    return NextResponse.json({
      canRender,
      script: analysis.script,
      scriptHash: analysis.scriptHash,
      wordCount: analysis.wordCount,
      estimatedDurationSec: analysis.estimatedDurationSec,
      checks,
      messages: analysis.messages,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Preflight check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

