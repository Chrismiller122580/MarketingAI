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