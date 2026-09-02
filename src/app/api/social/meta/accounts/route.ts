import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getMetaLogin,
  listMetaPages,
  type MetaPageOption,
} from "@/lib/social/meta-login";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const su = session.user as Record<string, unknown>;
  const sessionToken =
    (typeof su.facebookAccessToken === "string" && su.facebookAccessToken) ||
    (typeof su.instagramAccessToken === "string" && su.instagramAccessToken) ||
    "";

  const stored = await getMetaLogin(session.user.id);
  const userToken = stored?.accessToken || sessionToken || "";

  if (!userToken) {
    return NextResponse.json({
      connected: false,
      email: session.user.email ?? stored?.email ?? null,
      loginName: stored?.name ?? null,
      pages: [] as MetaPageOption[],
    });
  }

  const pages = await listMetaPages(userToken);

  return NextResponse.json({
    connected: true,
    loginName: stored?.name ?? null,
    email: stored?.email ?? session.user.email ?? null,
    pages,
  });
}
