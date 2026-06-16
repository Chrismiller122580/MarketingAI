import { prisma } from "@/lib/db";
import { postToSaved } from "@/lib/db-mappers";
import { publishPost as publishToSocial } from "@/lib/social/publishers";
import type { PublishResult, SavedPost } from "@/lib/types";

export async function buildPublishContext(
  post: {
    platform: string;
    siteId: string | null;
  },
  sessionTwitterToken?: string,
): Promise<Record<string, string>> {
  const extraCtx: Record<string, string> = {};

  const siteSocial = post.siteId
    ? await prisma.siteSocialConnection.findFirst({
        where: { siteId: post.siteId, platform: post.platform },
      })
    : null;

  if (siteSocial?.accessToken) {
    switch (post.platform) {
      case "twitter":
        extraCtx.twitterAccessToken = siteSocial.accessToken;
        break;
      case "linkedin":
        extraCtx.linkedinAccessToken = siteSocial.accessToken;
        break;
      case "facebook":
        extraCtx.facebookAccessToken = siteSocial.accessToken;
        if (siteSocial.accountId) extraCtx.facebookPageId = siteSocial.accountId;
        break;
      case "instagram":
        extraCtx.instagramAccessToken = siteSocial.accessToken;
        if (siteSocial.accountId) extraCtx.instagramAccountId = siteSocial.accountId;
        break;
      case "pinterest":
        extraCtx.pinterestAccessToken = siteSocial.accessToken;
        if (siteSocial.accountId) extraCtx.pinterestBoardId = siteSocial.accountId;
        break;
      case "email":
        if (siteSocial.accountId) extraCtx.emailRecipient = siteSocial.accountId;
        break;
    }
  } else if (sessionTwitterToken && post.platform === "twitter") {
    extraCtx.twitterAccessToken = sessionTwitterToken;
  }

  return extraCtx;
}

export async function publishPostRecord(
  postId: string,
  sessionTwitterToken?: string,
): Promise<{ post: SavedPost; result: PublishResult } | { error: string }> {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return { error: "Post not found" };

  const extraCtx = await buildPublishContext(post, sessionTwitterToken);
  const result = await publishToSocial({
    ...postToSaved(post),
    ...extraCtx,
  });

  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      publishStatus: result.success ? "published" : "failed",
      publishedAt: result.publishedAt ? new Date(result.publishedAt) : new Date(),
      publishUrl: result.url ?? null,
    },
  });

  return { post: postToSaved(updated), result };
}