import { NextResponse } from "next/server";
import { isAuthError, requireAuthUserId } from "@/lib/auth-helpers";
import { publishPost } from "@/lib/social/publishers";
import type { SavedPost } from "@/lib/types";

export async function POST(request: Request) {
  const authResult = await requireAuthUserId();
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await request.json();
    const post = body.post as SavedPost;

    if (!post?.text || !post?.platform) {
      return NextResponse.json(
        { error: "Valid post data required" },
        { status: 400 },
      );
    }

    if (body.scheduleAt) {
      const scheduleDate = new Date(body.scheduleAt);
      if (scheduleDate > new Date()) {
        return NextResponse.json({
          success: true,
          platform: post.platform,
          method: "scheduled",
          message: `Scheduled for ${scheduleDate.toLocaleString()}`,
          publishedAt: scheduleDate.toISOString(),
        });
      }
    }

    const result = await publishPost(post);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Publish failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
