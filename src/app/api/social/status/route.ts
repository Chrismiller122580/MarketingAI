import { NextResponse } from "next/server";
import {
  getAiImageProvider,
  getAiProvider,
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

  return NextResponse.json({
    connections,
    connectedCount,
    aiCopyAvailable: !!copyProvider,
    aiImageAvailable: !!imageProvider,
    aiCopyProvider: copyProvider,
    aiImageProvider: imageProvider,
    twitterOAuthEnabled: hasTwitterOAuthCredentials(),
    twitterBearerOnly: isTwitterBearerOnly(),
    guides: INTEGRATION_GUIDES,
  });
}