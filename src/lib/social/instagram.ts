import { getAppOrigin } from "../app-url";
import { fetchFacebookPages } from "./facebook";


export type InstagramAccount = {
  igUserId: string;
  pageId: string;
  pageName: string;
  accessToken: string;
};

type GraphErrorBody = {
  error?: { message?: string; code?: number };
};

async function parseGraphError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as GraphErrorBody;
    if (body.error?.message) {
      return `${body.error.message}${body.error.code ? ` (${body.error.code})` : ""}`;
    }
  } catch {
    /* ignore */
  }
  return `Instagram API error: ${response.status}`;
}

function resolvePublicMediaUrl(url: string): string | null {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${getAppOrigin()}${url}`;
  return null;
}

export async function resolveInstagramAccount(
  userAccessToken: string,
  preferredPageId?: string,
): Promise<InstagramAccount | null> {
  const pages = await fetchFacebookPages(userAccessToken);
  if (pages.length === 0) return null;

  const candidates = preferredPageId
    ? pages.filter((p) => p.id === preferredPageId)
    : pages;

  for (const page of candidates.length > 0 ? candidates : pages) {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${encodeURIComponent(page.accessToken)}`,
    );
    if (!response.ok) continue;

    const data = await response.json();
    const igUserId = data.instagram_business_account?.id as string | undefined;
    if (!igUserId) continue;

    return {
      igUserId,
      pageId: page.id,
      pageName: page.name,
      accessToken: page.accessToken,
    };
  }

  return null;
}

async function waitForMediaContainer(
  containerId: string,
  accessToken: string,
  maxAttempts = 15,
): Promise<{ ready: boolean; error?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!response.ok) {
      return { ready: false, error: await parseGraphError(response) };
    }

    const data = await response.json();
    const status = data.status_code as string | undefined;
    if (status === "FINISHED") return { ready: true };
    if (status === "ERROR") {
      return { ready: false, error: "Instagram media processing failed" };
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  return { ready: false, error: "Instagram media processing timed out" };
}

export type InstagramMediaFormat = "feed" | "reels" | "stories";

export async function publishInstagramPost(options: {
  igUserId: string;
  accessToken: string;
  caption: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaFormat?: InstagramMediaFormat;
}): Promise<{ id?: string; error?: string }> {
  const { igUserId, accessToken, caption, imageUrl, videoUrl, mediaFormat } =
    options;

  const publicImage = imageUrl ? resolvePublicMediaUrl(imageUrl) : null;
  const publicVideo = videoUrl ? resolvePublicMediaUrl(videoUrl) : null;

  const containerBody: Record<string, string> = {
    access_token: accessToken,
  };

  if (mediaFormat !== "stories") {
    containerBody.caption = caption;
  }

  if (publicVideo) {
    containerBody.media_type =
      mediaFormat === "stories" ? "STORIES" : "REELS";
    containerBody.video_url = publicVideo;
  } else if (publicImage) {
    if (mediaFormat === "stories") {
      containerBody.media_type = "STORIES";
    }
    containerBody.image_url = publicImage;
  } else {
    return { error: "Instagram posts require a public image or video URL" };
  }

  const createResponse = await fetch(
    `https://graph.facebook.com/v19.0/${igUserId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(containerBody),
    },
  );

  if (!createResponse.ok) {
    return { error: await parseGraphError(createResponse) };
  }

  const created = await createResponse.json();
  const containerId = created.id as string | undefined;
  if (!containerId) {
    return { error: "Instagram did not return a media container ID" };
  }

  if (publicVideo || mediaFormat === "stories") {
    const ready = await waitForMediaContainer(containerId, accessToken);
    if (!ready.ready) {
      return { error: ready.error ?? "Media not ready for publishing" };
    }
  }

  const publishResponse = await fetch(
    `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    },
  );

  if (!publishResponse.ok) {
    return { error: await parseGraphError(publishResponse) };
  }

  const published = await publishResponse.json();
  return { id: published.id as string | undefined };
}

export async function verifyInstagramCredentials(
  accessToken: string,
  igUserId: string,
): Promise<{ ok: boolean; username?: string; error?: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}?fields=id,username&access_token=${encodeURIComponent(accessToken)}`,
    );

    if (!response.ok) {
      return { ok: false, error: await parseGraphError(response) };
    }

    const data = await response.json();
    return { ok: true, username: data.username as string | undefined };
  } catch {
    return { ok: false, error: "Failed to reach Instagram API" };
  }
}