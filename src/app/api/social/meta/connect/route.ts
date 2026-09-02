import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { persistMetaUserToken } from "@/lib/social/meta-login";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const su = session.user as Record<string, unknown>;
  const sessionToken =
    (typeof su.facebookAccessToken === "string" && su.facebookAccessToken) ||
    (typeof su.instagramAccessToken === "string" && su.instagramAccessToken) ||
    "";

  if (!sessionToken) {
    return NextResponse.json(
      {
        error:
          "No Meta token in this session. Tap Connect Facebook / Meta and approve access.",
      },
      { status: 400 },
    );
  }

  const platform =
    typeof su.instagramAccessToken === "string" && !su.facebookAccessToken
      ? "instagram"
      : "facebook";

  const login = await persistMetaUserToken(
    session.user.id,
    sessionToken,
    platform,
  );

  if (!login) {
    return NextResponse.json(
      { error: "Could not save this Meta login." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    loginName: login.name,
    email: login.email,
  });
}
