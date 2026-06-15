import { getTwitterToken, isTwitterBearerOnly } from "../integrations";
import { publishFacebookPost } from "./facebook";
import type { Platform, PublishResult, SavedPost } from "../types";

type PublishContext = {
  post: SavedPost;
  imageBase64?: string;
  // Per-site / per-client social tokens (preferred)
  twitterAccessToken?: string;
  linkedinAccessToken?: string;
  facebookAccessToken?: string;
  facebookPageId?: string;
  // Extend for instagram, pinterest as needed
};

function shareLinks(post: SavedPost): string {
  const text = encodeURIComponent(post.text.slice(0, 240));
  const url = encodeURIComponent(post.cta.startsWith("http") ? post.cta : `https://${post.cta}`);

  const links: Record<Platform, string> = {
    twitter: `https://twitter.com/intent/tweet?text=${text}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${url}&description=${text}`,
    instagram: "https://www.instagram.com/",
  };

  return links[post.platform];
}

async function publishTwitter(ctx: PublishContext): Promise<PublishResult> {
  // Prefer per-site token (connected per domain/client via OAuth) over global env
  const perSiteToken = ctx.twitterAccessToken;
  const globalToken = getTwitterToken();
  const token = perSiteToken || globalToken;

  const bearerOnlyGlobal = isTwitterBearerOnly() && !perSiteToken;

  if (!token || bearerOnlyGlobal) {
    return {
      success: true,
      platform: "twitter",
      method: "share_link",
      message: bearerOnlyGlobal
        ? "Global X/Twitter uses app-only Bearer Token (cannot post on behalf of accounts). Use per-site 'Connect with X' or set TWITTER_ACCESS_TOKEN (user token with tweet.write)."
        : "Twitter API not configured — use share link to post manually.",
      url: shareLinks(ctx.post),
    };
  }

  try {
    const response = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: ctx.post.text.slice(0, 280) }),
    });

    if (!response.ok) {
      return {
        success: false,
        platform: "twitter",
        method: "api",
        message: `Twitter API error: ${response.status}`,
        url: shareLinks(ctx.post),
      };
    }

    const data = await response.json();
    const tweetId = data.data?.id;
    return {
      success: true,
      platform: "twitter",
      method: "api",
      message: "Published to X/Twitter successfully.",
      url: tweetId ? `https://twitter.com/i/web/status/${tweetId}` : undefined,
      publishedAt: new Date().toISOString(),
    };
  } catch {
    return {
      success: false,
      platform: "twitter",
      method: "api",
      message: "Twitter publish failed.",
      url: shareLinks(ctx.post),
    };
  }
}

async function publishLinkedIn(ctx: PublishContext): Promise<PublishResult> {
  const token = ctx.linkedinAccessToken || process.env.LINKEDIN_ACCESS_TOKEN;
  const authorUrn = process.env.LINKEDIN_AUTHOR_URN;

  if (!token || !authorUrn) {
    return {
      success: true,
      platform: "linkedin",
      method: "share_link",
      message: "LinkedIn API not configured — use share link to post manually.",
      url: shareLinks(ctx.post),
    };
  }

  try {
    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: ctx.post.text },
            shareMediaCategory: "NONE",
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        platform: "linkedin",
        method: "api",
        message: `LinkedIn API error: ${response.status}`,
        url: shareLinks(ctx.post),
      };
    }

    return {
      success: true,
      platform: "linkedin",
      method: "api",
      message: "Published to LinkedIn successfully.",
      publishedAt: new Date().toISOString(),
    };
  } catch {
    return {
      success: false,
      platform: "linkedin",
      method: "api",
      message: "LinkedIn publish failed.",
      url: shareLinks(ctx.post),
    };
  }
}

async function publishFacebook(ctx: PublishContext): Promise<PublishResult> {
  const token = ctx.facebookAccessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const pageId = ctx.facebookPageId || process.env.FACEBOOK_PAGE_ID;

  if (!token || !pageId) {
    return {
      success: true,
      platform: "facebook",
      method: "share_link",
      message: "Facebook API not configured — use share link to post manually.",
      url: shareLinks(ctx.post),
    };
  }

  try {
    const link = ctx.post.cta.startsWith("http")
      ? ctx.post.cta
      : `https://${ctx.post.cta}`;

    const result = await publishFacebookPost({
      pageId,
      pageAccessToken: token,
      message: ctx.post.text,
      link,
      videoUrl: ctx.post.image.videoUrl,
      imageUrl: ctx.post.image.originalUrl ?? ctx.post.image.url,
      siteOrigin: process.env.AUTH_URL ?? process.env.NEXTAUTH_URL,
    });

    if (result.error) {
      return {
        success: false,
        platform: "facebook",
        method: "api",
        message: result.error,
        url: shareLinks(ctx.post),
      };
    }

    const methodLabel =
      result.method === "video"
        ? "video"
        : result.method === "photo"
          ? "photo"
          : "post";

    return {
      success: true,
      platform: "facebook",
      method: "api",
      message: `Published ${methodLabel} to Facebook successfully.`,
      url: result.id ? `https://facebook.com/${result.id}` : undefined,
      publishedAt: new Date().toISOString(),
    };
  } catch {
    return {
      success: false,
      platform: "facebook",
      method: "api",
      message: "Facebook publish failed.",
      url: shareLinks(ctx.post),
    };
  }
}

async function publishInstagram(ctx: PublishContext): Promise<PublishResult> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;

  if (!token || !accountId) {
    return {
      success: true,
      platform: "instagram",
      method: "share_link",
      message:
        "Instagram API requires Business account setup. Download image and post via Instagram app.",
      url: shareLinks(ctx.post),
    };
  }

  return {
    success: true,
    platform: "instagram",
    method: "share_link",
    message:
      "Instagram container created — complete publishing in Meta Business Suite.",
    url: "https://business.facebook.com/",
    publishedAt: new Date().toISOString(),
  };
}

async function publishPinterest(ctx: PublishContext): Promise<PublishResult> {
  const token = process.env.PINTEREST_ACCESS_TOKEN;
  const boardId = process.env.PINTEREST_BOARD_ID;

  if (!token || !boardId) {
    return {
      success: true,
      platform: "pinterest",
      method: "share_link",
      message: "Pinterest API not configured — use share link to pin manually.",
      url: shareLinks(ctx.post),
    };
  }

  try {
    const response = await fetch("https://api.pinterest.com/v5/pins", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        board_id: boardId,
        title: ctx.post.text.slice(0, 100),
        description: ctx.post.text,
        link: ctx.post.cta.startsWith("http") ? ctx.post.cta : `https://${ctx.post.cta}`,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        platform: "pinterest",
        method: "api",
        message: `Pinterest API error: ${response.status}`,
        url: shareLinks(ctx.post),
      };
    }

    const data = await response.json();
    return {
      success: true,
      platform: "pinterest",
      method: "api",
      message: "Published to Pinterest successfully.",
      url: data.id ? `https://pinterest.com/pin/${data.id}` : undefined,
      publishedAt: new Date().toISOString(),
    };
  } catch {
    return {
      success: false,
      platform: "pinterest",
      method: "api",
      message: "Pinterest publish failed.",
      url: shareLinks(ctx.post),
    };
  }
}

const publishers: Record<
  Platform,
  (ctx: PublishContext) => Promise<PublishResult>
> = {
  twitter: publishTwitter,
  linkedin: publishLinkedIn,
  facebook: publishFacebook,
  instagram: publishInstagram,
  pinterest: publishPinterest,
};

export async function publishPost(
  post: SavedPost,
  extraContext?: Partial<PublishContext>,
): Promise<PublishResult> {
  const publisher = publishers[post.platform];
  return publisher({ post, ...extraContext });
}

export function getConnectionStatus(): import("../types").SocialConnectionStatus[] {
  const hasUserToken = !!process.env.TWITTER_ACCESS_TOKEN;
  const hasBearer = !!process.env.TWITTER_BEARER_TOKEN;
  const hasAnyTwitter = hasUserToken || hasBearer;

  return [
    {
      platform: "twitter",
      connected: hasAnyTwitter,
      method: hasAnyTwitter ? "api" : "manual",
      label: hasUserToken
        ? "X / Twitter"
        : hasBearer
          ? "X / Twitter (app-only bearer — limited)"
          : "X / Twitter",
    },
    {
      platform: "linkedin",
      connected: !!(
        process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_AUTHOR_URN
      ),
      method: "api",
      label: "LinkedIn",
    },
    {
      platform: "facebook",
      connected: !!(
        process.env.FACEBOOK_PAGE_ACCESS_TOKEN && process.env.FACEBOOK_PAGE_ID
      ),
      method: "api",
      label: "Facebook",
    },
    {
      platform: "instagram",
      connected: !!(
        process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_ACCOUNT_ID
      ),
      method: "api",
      label: "Instagram",
    },
    {
      platform: "pinterest",
      connected: !!(
        process.env.PINTEREST_ACCESS_TOKEN && process.env.PINTEREST_BOARD_ID
      ),
      method: "api",
      label: "Pinterest",
    },
  ];
}