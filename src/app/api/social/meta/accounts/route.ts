import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchFacebookPages } from "@/lib/social/facebook";

export type MetaPageOption = {
  id: string;
  name: string;
  instagram: { id: string; username: string | null } | null;
};

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

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const su = session.user as Record<string, unknown>;
  const userToken =
    (typeof su.facebookAccessToken === "string" && su.facebookAccessToken) ||
    (typeof su.instagramAccessToken === "string" && su.instagramAccessToken) ||
    "";

  if (!userToken) {
    return NextResponse.json({
      connected: false,
      email: session.user.email ?? null,
      pages: [] as MetaPageOption[],
    });
  }

  const rawPages = await fetchFacebookPages(userToken);
  const pages: MetaPageOption[] = await Promise.all(
    rawPages.map(async (page) => ({
      id: page.id,
      name: page.name,
      instagram: await instagramForPage(page.id, page.accessToken),
    })),
  );

  let loginName: string | null = null;
  let loginEmail: string | null = session.user.email ?? null;
  try {
    const meRes = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${encodeURIComponent(userToken)}`,
    );
    if (meRes.ok) {
      const me = (await meRes.json()) as {
        name?: string;
        email?: string;
      };
      loginName = me.name ?? null;
      loginEmail = me.email ?? loginEmail;
    }
  } catch {
    /* optional */
  }

  return NextResponse.json({
    connected: true,
    loginName,
    email: loginEmail,
    pages,
  });
}
