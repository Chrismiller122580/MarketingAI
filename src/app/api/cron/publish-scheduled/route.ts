import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publishPostRecord } from "@/lib/publish-post";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];

  try {
    const duePosts = await prisma.post.findMany({
      where: {
        publishStatus: "scheduled",
        scheduledFor: { lte: today },
      },
      orderBy: { scheduledFor: "asc" },
      take: 50,
    });

    const results: Array<{
      postId: string;
      success: boolean;
      message: string;
    }> = [];

    for (const post of duePosts) {
      const outcome = await publishPostRecord(post.id);
      if ("error" in outcome) {
        results.push({ postId: post.id, success: false, message: outcome.error });
      } else {
        results.push({
          postId: post.id,
          success: outcome.result.success,
          message: outcome.result.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      date: today,
      processed: results.length,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}