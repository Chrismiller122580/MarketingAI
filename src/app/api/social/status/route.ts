import { NextResponse } from "next/server";
import { auth } from "@/auth";
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
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  const copyProvider = getAiProvider();
  const imageProvider = getAiImageProvider();
  const videoProvider = getAiVideoProvider();
  const voiceProvider = getAiVoiceProvider();

  if (!isAdmin) {
    return NextResponse.json({
      aiCopyAvailable: !!copyProvider,
      aiImageAvailable: !!imageProvider,
      aiVideoAvailable: !!videoProvider,
      aiVoiceAvailable: !!voiceProvider,
      connections: [],
      connectedCount: 0,
      guides: [],
    });
  }

  const connections = getConnectionStatus();
  return NextResponse.json({
    connections,
    connectedCount: connections.filter((c) => c.connected).length,
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
