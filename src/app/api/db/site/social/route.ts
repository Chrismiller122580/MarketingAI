import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");

  if (!domain) {
    return NextResponse.json({ error: "domain query param is required" }, { status: 400 });
  }

  try {
    const site = await prisma.site.findFirst({
      where: { userId, domain },
      include: {
        socialConnections: true,
      },
    });

    if (!site) {
      return NextResponse.json({ connections: [] });
    }

    return NextResponse.json({ connections: site.socialConnections });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
