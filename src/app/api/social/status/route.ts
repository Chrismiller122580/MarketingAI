import { NextResponse } from "next/server";
import { getConnectionStatus } from "@/lib/social/publishers";

export async function GET() {
  const connections = getConnectionStatus();
  const connectedCount = connections.filter((c) => c.connected).length;

  return NextResponse.json({
    connections,
    connectedCount,
    aiImageAvailable: !!(
      process.env.OPENAI_API_KEY || process.env.XAI_API_KEY
    ),
    aiCopyAvailable: !!(
      process.env.OPENAI_API_KEY || process.env.XAI_API_KEY
    ),
  });
}