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
  return `Meta API error: ${response.status}`;
}

export function getMetaOAuthCredentials(platform: "facebook" | "instagram"): {
  clientId: string | undefined;
  clientSecret: string | undefined;
} {
  if (platform === "instagram") {
    return {
      clientId:
        process.env.INSTAGRAM_CLIENT_ID ?? process.env.FACEBOOK_CLIENT_ID,
      clientSecret:
        process.env.INSTAGRAM_CLIENT_SECRET ??
        process.env.FACEBOOK_CLIENT_SECRET,
    };
  }

  return {
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  };
}

export async function exchangeMetaLongLivedToken(
  shortLivedToken: string,
  platform: "facebook" | "instagram",
): Promise<{ accessToken?: string; expiresIn?: number; error?: string }> {
  const { clientId, clientSecret } = getMetaOAuthCredentials(platform);
  if (!clientId || !clientSecret) {
    return { error: "Meta OAuth client credentials not configured" };
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