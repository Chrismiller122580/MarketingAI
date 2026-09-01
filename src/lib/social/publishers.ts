import { hasTwitterOAuthCredentials } from "../integrations";
import { resolvePublicMediaUrl } from "../blob-storage";
import { getAppOrigin } from "../app-url";
import { sendViaResend, textToHtml } from "../email";
import { publishFacebookPost } from "./facebook";
import { instagramMediaType } from "../content-formats";
import { publishInstagramPost } from "./instagram";
import type { Platform, PublishResult, SavedPost } from "../types";

type PublishContext = {
  post: SavedPost;
  imageBase64?: string;
  // Per-site / per-client social tokens only (no shared env tokens)
  twitterAccessToken?: string;
  linkedinAccessToken?: string;
  linkedinAuthorUrn?: string;
  facebookAccessToken?: string;
  facebookPageId?: string;
  instagramAccessToken?: string;
  instagramAccountId?: string;
  pinterestAccessToken?: string;
  pinterestBoardId?: string;
  emailRecipient?: string;
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
    email: "",
  };

  return links[post.platform];
}

function parseEmailContent(text: string, fallbackSubject: string) {
  const subjectMatch = text.match(/^Subject:\s*(.+)$/m);
  const subject = subjectMatch?.[1]?.trim() ?? fallbackSubject;
  const body = text.replace(/^Subject:\s*.+\n*/m, "").trim();
  return { subject, body };
}

function toLinkedInAuthorUrn(raw?: string): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  if (value.startsWith("urn:")) return value;
  return `urn:li:person:${value}`;
}

async function publishTwitter(ctx: PublishContext): Promise<PublishResult> {
  const token = ctx.twitterAccessToken;

  if (!token) {
    return {
      success: true,
      platform: "twitter",
      method: "share_link",
      message:
        "X is not connected for this site — use the share link, or Connect with X in Settings.",
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
      externalId: tweetId,
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
  const token = ctx.linkedinAccessToken;
  const authorUrn = toLinkedInAuthorUrn(ctx.linkedinAuthorUrn);

  if (!token || !authorUrn) {
    return {
      success: true,
      platform: "linkedin",
      method: "share_link",
      message:
        "LinkedIn is not connected for this site — use the share link, or Connect with LinkedIn in Settings.",
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

    const linkedInId = response.headers.get("x-restli-id") ?? undefined;

    return {
      success: true,
      platform: "linkedin",
      method: "api",
      message: "Published to LinkedIn successfully.",
      externalId: linkedInId,
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
  const token = ctx.facebookAccessToken;
  const pageId = ctx.facebookPageId;

  if (!token || !pageId) {
    return {
      success: true,
      platform: "facebook",
      method: "share_link",
      message:
        "Facebook is not connected for this site — use the share link, or Connect with Facebook in Settings.",
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
      videoUrl: ctx.post.image.videoUrl
        ? resolvePublicMediaUrl(ctx.post.image.videoUrl)
        : undefined,
      imageUrl: resolvePublicMediaUrl(
        ctx.post.image.originalUrl ?? ctx.post.image.url,
      ),
      siteOrigin: getAppOrigin(),
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
      externalId: result.id,
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
  const token = ctx.instagramAccessToken;
  const accountId = ctx.instagramAccountId;

  if (!token || !accountId) {
    return {
      success: true,
      platform: "instagram",
      method: "share_link",
      message:
        "Instagram is not connected for this site — connect Instagram in Settings, or open the share link.",
      url: shareLinks(ctx.post),
    };
  }

  try {
    const mediaKind = instagramMediaType(
      ctx.post.contentType,
      !!ctx.post.image.videoUrl,
    );
    const mediaFormat =
      mediaKind === "STORIES"
        ? "stories"
        : mediaKind === "REELS"
          ? "reels"
          : "feed";

    const result = await publishInstagramPost({
      igUserId: accountId,
      accessToken: token,
      caption: ctx.post.text,
      videoUrl: ctx.post.image.videoUrl
        ? resolvePublicMediaUrl(ctx.post.image.videoUrl)
        : undefined,
      imageUrl: resolvePublicMediaUrl(
        ctx.post.image.originalUrl ?? ctx.post.image.url,
      ),
      mediaFormat,
    });

    if (result.error) {
      return {
        success: false,
        platform: "instagram",
        method: "api",
        message: result.error,
        url: shareLinks(ctx.post),
      };
    }

    return {
      success: true,
      platform: "instagram",
      method: "api",
      message: "Published to Instagram successfully.",
      url: result.id ? `https://www.instagram.com/p/${result.id}` : undefined,
      externalId: result.id,
      publishedAt: new Date().toISOString(),
    };
  } catch {
    return {
      success: false,
      platform: "instagram",
      method: "api",
      message: "Instagram publish failed.",
      url: shareLinks(ctx.post),
    };
  }
}

async function publishEmail(ctx: PublishContext): Promise<PublishResult> {
  const { subject, body } = parseEmailContent(
    ctx.post.text,
    `${ctx.post.cta} — update`,
  );
  const to = ctx.emailRecipient?.trim() || "";
  if (!to) {
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return {
      success: true,
      platform: "email",
      method: "share_link",
      message:
        "No recipient set for this site — use Set email recipient in Settings.",
      url: mailto,
    };
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (resendKey && from) {
    const sent = await sendViaResend({
      to,
      subject,
      text: body,
      html: textToHtml(body),
      idempotencyKey: `post/${ctx.post.id ?? subject}`.slice(0, 256),
    });

    if (sent.ok) {
      return {
        success: true,
        platform: "email",
        method: "api",
        message: `Email sent to ${to} via Resend.`,
        publishedAt: new Date().toISOString(),
        url: `mailto:${to}`,
      };
    }

    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return {
      success: false,
      platform: "email",
      method: "share_link",
      message: `Resend error: ${sent.error}. Open mailto draft instead.`,
      url: mailto,
    };
  }

  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return {
    success: true,
    platform: "email",
    method: "share_link",
    message:
      "Open your mail client to send (set RESEND_API_KEY + EMAIL_FROM on Vercel for direct send).",
    url: mailto,
  };
}

async function publishPinterest(ctx: PublishContext): Promise<PublishResult> {
  const token = ctx.pinterestAccessToken;
  const boardId = ctx.pinterestBoardId;

  if (!token || !boardId) {
    return {
      success: true,
      platform: "pinterest",
      method: "share_link",
      message:
        "Pinterest is not connected for this site — use the share link, or Connect Pinterest in Settings.",
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
      externalId: data.id as string | undefined,
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
  email: publishEmail,
};

export async function publishPost(
  post: SavedPost,
  extraContext?: Partial<PublishContext>,
): Promise<PublishResult> {
  const publisher = publishers[post.platform];
  return publisher({ post, ...extraContext });
}

export function getConnectionStatus(): import("../types").SocialConnectionStatus[] {
  return [
    {
      platform: "twitter",
      connected: hasTwitterOAuthCredentials(),
      method: hasTwitterOAuthCredentials() ? "api" : "manual",
      label: "X / Twitter",
    },
    {
      platform: "linkedin",
      connected: !!(
        process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET
      ),
      method: "api",
      label: "LinkedIn",
    },
    {
      platform: "facebook",
      connected: !!(
        process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
      ),
      method: "api",
      label: "Facebook",
    },
    {
      platform: "instagram",
      connected: !!(
        process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET
      ),
      method: "api",
      label: "Instagram",
    },
    {
      platform: "pinterest",
      connected: !!(
        process.env.PINTEREST_CLIENT_ID && process.env.PINTEREST_CLIENT_SECRET
      ),
      method: "api",
      label: "Pinterest",
    },
    {
      platform: "email",
      connected: !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
      method: "api",
      label: "Email (Resend)",
    },
  ];
}
