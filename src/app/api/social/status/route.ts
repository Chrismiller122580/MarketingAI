import { NextResponse } from "next/server";
import {
  getAiImageProvider,
  getAiProvider,
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
    guides: INTEGRATION_GUIDES,
  });
}