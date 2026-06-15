export type FacebookPage = {
  id: string;
  name: string;
  accessToken: string;
};

export async function fetchFacebookPages(
  userAccessToken: string,
): Promise<FacebookPage[]> {
  const response = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(userAccessToken)}`,
  );

  if (!response.ok) return [];

  const data = await response.json();
  const pages = Array.isArray(data.data) ? data.data : [];

  return pages
    .filter((p: { id?: string; access_token?: string }) => p.id && p.access_token)
    .map((p: { id: string; name?: string; access_token: string }) => ({
      id: p.id,
      name: p.name ?? "Facebook Page",
      accessToken: p.access_token,
    }));
}

export async function resolveFacebookPageToken(
  userAccessToken: string,
  preferredPageId?: string,
): Promise<FacebookPage | null> {
  const pages = await fetchFacebookPages(userAccessToken);
  if (pages.length === 0) return null;

  if (preferredPageId) {
    return pages.find((p) => p.id === preferredPageId) ?? pages[0];
  }

  return pages[0];
}

type GraphErrorBody = {
  error?: { message?: string; type?: string; code?: number };
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
  return `Facebook API error: ${response.status}`;
}

function resolvePublicMediaUrl(url: string, siteOrigin?: string): string | null {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/") && siteOrigin) return `${siteOrigin.replace(/\/$/, "")}${url}`;
  return null;
}

export async function publishFacebookVideo(
  pageId: string,
  pageAccessToken: string,
  videoUrl: string,
  message: string,
): Promise<{ id?: string; error?: string }> {
  const response = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}/videos`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_url: videoUrl,
        description: message,
        access_token: pageAccessToken,
      }),
    },
  );

  if (!response.ok) {
    return { error: await parseGraphError(response) };
  }

  const data = await response.json();
  return { id: data.id as string | undefined };
}

export async function publishFacebookPhoto(
  pageId: string,
  pageAccessToken: string,
  imageUrl: string,
  message: string,
  link?: string,
): Promise<{ id?: string; error?: string }> {
  const response = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}/photos`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: imageUrl,
        message,
        ...(link ? { link } : {}),
        access_token: pageAccessToken,
      }),
    },
  );

  if (!response.ok) {
    return { error: await parseGraphError(response) };
  }

  const data = await response.json();
  return { id: (data.post_id ?? data.id) as string | undefined };
}

export async function publishFacebookFeedPost(
  pageId: string,
  pageAccessToken: string,
  message: string,
  link?: string,
): Promise<{ id?: string; error?: string }> {
  const response = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}/feed`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        ...(link ? { link } : {}),
        access_token: pageAccessToken,
      }),
    },
  );

  if (!response.ok) {
    return { error: await parseGraphError(response) };
  }

  const data = await response.json();
  return { id: data.id as string | undefined };
}

export async function publishFacebookPost(options: {
  pageId: string;
  pageAccessToken: string;
  message: string;
  link?: string;
  imageUrl?: string;
  videoUrl?: string;
  siteOrigin?: string;
}): Promise<{ id?: string; error?: string; method: "video" | "photo" | "feed" }> {
  const { pageId, pageAccessToken, message, link, videoUrl, imageUrl, siteOrigin } =
    options;

  if (videoUrl) {
    const result = await publishFacebookVideo(
      pageId,
      pageAccessToken,
      videoUrl,
      message,
    );
    return { ...result, method: "video" };
  }

  const publicImage = imageUrl
    ? resolvePublicMediaUrl(imageUrl, siteOrigin)
    : null;

  if (publicImage) {
    const result = await publishFacebookPhoto(
      pageId,
      pageAccessToken,
      publicImage,
      message,
      link,
    );
    return { ...result, method: "photo" };
  }

  const result = await publishFacebookFeedPost(
    pageId,
    pageAccessToken,
    message,
    link,
  );
  return { ...result, method: "feed" };
}

export async function exchangeFacebookLongLivedToken(
  shortLivedToken: string,
): Promise<{ accessToken?: string; expiresIn?: number; error?: string }> {
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { error: "FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET required" };
  }

  const url = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const response = await fetch(url);
  if (!response.ok) {
    return { error: await parseGraphError(response) };
  }

  const data = await response.json();
  return {
    accessToken: data.access_token as string | undefined,
    expiresIn: data.expires_in as number | undefined,
  };
}

export async function verifyFacebookPageCredentials(
  pageAccessToken: string,
  pageId: string,
): Promise<{ ok: boolean; pageName?: string; error?: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}?fields=id,name&access_token=${encodeURIComponent(pageAccessToken)}`,
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        ok: false,
        error: (err as { error?: { message?: string } }).error?.message ??
          `Facebook API error: ${response.status}`,
      };
    }

    const data = await response.json();
    return { ok: true, pageName: data.name as string | undefined };
  } catch {
    return { ok: false, error: "Failed to reach Facebook API" };
  }
}