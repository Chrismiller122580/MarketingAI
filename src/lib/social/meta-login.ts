import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { fetchFacebookPages } from "./facebook";
import { exchangeMetaLongLivedToken } from "./meta-credentials";

export type StoredMetaLogin = {
  accessToken: string;
  expiresAt?: string | null;
  userId?: string | null;
  name?: string | null;
  email?: string | null;
};

export type MetaPageOption = {
  id: string;
  name: string;
  instagram: { id: string; username: string | null } | null;
};

const SETTINGS_DEFAULTS = {
  brandVoice:
    "Professional yet approachable. Focus on clarity and value. Avoid jargon.",
  targetAudience: "Business professionals and decision-makers",
  defaultPlatforms: ["instagram", "linkedin", "twitter"],
  includeHashtags: true,
  emojiStyle: "light",
  preferAiImages: false,
};

export function parseMetaLogin(value: unknown): StoredMetaLogin | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.accessToken !== "string" || !v.accessToken) return null;
  return {
    accessToken: v.accessToken,
    expiresAt: typeof v.expiresAt === "string" ? v.expiresAt : null,
    userId: typeof v.userId === "string" ? v.userId : null,
    name: typeof v.name === "string" ? v.name : null,
    email: typeof v.email === "string" ? v.email : null,
  };
}

export async function getMetaLogin(
  userId: string,
): Promise<StoredMetaLogin | null> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { metaLogin: true },
  });
  return parseMetaLogin(settings?.metaLogin);
}

export async function saveMetaLogin(
  userId: string,
  login: StoredMetaLogin,
): Promise<void> {
  await prisma.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      ...SETTINGS_DEFAULTS,
      metaLogin: login as Prisma.InputJsonValue,
    },
    update: {
      metaLogin: login as Prisma.InputJsonValue,
    },
  });
}

export async function persistMetaUserToken(
  userId: string,
  shortOrLongLivedToken: string,
  platform: "facebook" | "instagram" = "facebook",
): Promise<StoredMetaLogin | null> {
  let accessToken = shortOrLongLivedToken;
  let expiresAt: string | null = null;

  const existing = await getMetaLogin(userId);

  const longLived = await exchangeMetaLongLivedToken(accessToken, platform);
  if (longLived.accessToken) {
    accessToken = longLived.accessToken;
    if (typeof longLived.expiresIn === "number") {
      expiresAt = new Date(Date.now() + longLived.expiresIn * 1000).toISOString();
    }
  } else if (existing?.accessToken && longLived.error) {
    return existing;
  }

  let name: string | null = null;
  let email: string | null = null;
  let metaUserId: string | null = null;
  try {
    const meRes = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (meRes.ok) {
      const me = (await meRes.json()) as {
        id?: string;
        name?: string;
        email?: string;
      };
      metaUserId = me.id ?? null;
      name = me.name ?? null;
      email = me.email ?? null;
    }
  } catch {
    /* optional */
  }

  if (!metaUserId) {
    return existing ?? null;
  }

  const login: StoredMetaLogin = {
    accessToken,
    expiresAt,
    userId: metaUserId,
    name,
    email,
  };
  await saveMetaLogin(userId, login);
  return login;
}

async function instagramForPage(
  pageId: string,
  pageAccessToken: string,
): Promise<MetaPageOption["instagram"]> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account{id,username}&access_token=${encodeURIComponent(pageAccessToken)}`,
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      instagram_business_account?: { id?: string; username?: string };
    };
    const ig = data.instagram_business_account;
    if (!ig?.id) return null;
    return { id: ig.id, username: ig.username ?? null };
  } catch {
    return null;
  }
}

export async function listMetaPages(
  userAccessToken: string,
): Promise<MetaPageOption[]> {
  const rawPages = await fetchFacebookPages(userAccessToken);
  return Promise.all(
    rawPages.map(async (page) => ({
      id: page.id,
      name: page.name,
      instagram: await instagramForPage(page.id, page.accessToken),
    })),
  );
}

export async function resolveMetaUserToken(options: {
  userId: string;
  sessionToken?: string;
}): Promise<string> {
  if (options.sessionToken) return options.sessionToken;
  const stored = await getMetaLogin(options.userId);
  return stored?.accessToken ?? "";
}
