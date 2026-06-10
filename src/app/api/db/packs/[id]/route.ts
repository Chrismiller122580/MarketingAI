import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireAuthUserId();
  if (isAuthError(userId)) return userId;

  try {
    const { id } = await params;
    const pack = await prisma.campaignPack.findFirst({
      where: { id, userId },
    });
    if (!pack) {
      return NextResponse.json({ error: "Pack not found" }, { status: 404 });
    }

    await prisma.campaignPack.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}