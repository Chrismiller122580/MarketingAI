import { NextResponse } from "next/server";
import {
  getAiImageProvider,
  getAiProvider,
  getAiVideoProvider,
  getAiVoiceProvider,
  hasTwitterOAuthCredentials,
  isTwitterBearerOnly,
  INTEGRATION_GUIDES,
} from "@/lib/integrations";
import { getConnectionStatus } from "@/lib/social/publishers";

export async function GET() {
  const connections = getConnectionStatus();
  const connectedCount = connections.filter((c) => c.connected).length;
  const copyProvider = getAiProvider();
  const imageProvider = getAiImageProvider();
  const videoProvider = getAiVideoProvider();
  const voiceProvider = getAiVoiceProvider();

  return NextResponse.json({
    connections,
    connectedCount,
    aiCopyAvailable: !!copyProvider,
    aiImageAvailable: !!imageProvider,
    aiVideoAvailable: !!videoProvider,
    aiVoiceAvailable: !!voiceProvider,
    aiCopyProvider: copyProvider,
    aiImageProvider: imageProvider,
    aiVideoProvider: videoProvider,
    aiVoiceProvider: voiceProvider,
    twitterOAuthEnabled: hasTwitterOAuthCredentials(),
    twitterBearerOnly: isTwitterBearerOnly(),
    guides: INTEGRATION_GUIDES,
  });
}