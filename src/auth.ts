import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Twitter from "next-auth/providers/twitter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const authSecret =
  process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          plan: user.plan,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionEndsAt: user.subscriptionEndsAt,
        };
      },
    }),
    Twitter({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "tweet.read tweet.write users.read offline.access",
        },
      },
    }),
    // Add other platforms for per-site OAuth
    {
      id: "linkedin",
      name: "LinkedIn",
      type: "oauth",
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      authorization: "https://www.linkedin.com/oauth/v2/authorization?scope=r_liteprofile%20w_member_social",
      token: "https://www.linkedin.com/oauth/v2/accessToken",
      userinfo: "https://api.linkedin.com/v2/me",
      profile(profile) {
        return {
          id: profile.id,
          name: `${profile.localizedFirstName} ${profile.localizedLastName}`,
          email: null,
        };
      },
    },
    {
      id: "facebook",
      name: "Facebook",
      type: "oauth",
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      authorization: "https://www.facebook.com/v10.0/dialog/oauth?scope=pages_manage_posts,pages_read_engagement",
      token: "https://graph.facebook.com/v10.0/oauth/accessToken",
      userinfo: "https://graph.facebook.com/me?fields=id,name,email",
      profile(profile) {
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user?.id) token.id = user.id;
      if (user?.role) token.role = user.role as string;

      // Propagate subscription fields
      if ((user as any)?.plan) token.plan = (user as any).plan;
      if ((user as any)?.subscriptionStatus !== undefined) token.subscriptionStatus = (user as any).subscriptionStatus;
      if ((user as any)?.subscriptionEndsAt !== undefined) token.subscriptionEndsAt = (user as any).subscriptionEndsAt;

      // Store OAuth tokens for social platforms (per user, will be linked to specific sites)
      if (account?.provider === "twitter") {
        token.twitterAccessToken = account.access_token;
        token.twitterRefreshToken = account.refresh_token;
      }
      if (account?.provider === "linkedin") {
        (token as any).linkedinAccessToken = account.access_token;
        (token as any).linkedinRefreshToken = account.refresh_token;
      }
      if (account?.provider === "facebook") {
        (token as any).facebookAccessToken = account.access_token;
        (token as any).facebookRefreshToken = account.refresh_token;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "user";
        (session.user as any).plan = (token.plan as string) ?? "free";
        (session.user as any).subscriptionStatus = (token.subscriptionStatus as string) ?? null;
        (session.user as any).subscriptionEndsAt = token.subscriptionEndsAt as string | null | undefined;

        // Expose social tokens on session (used for linking to specific sites)
        (session.user as any).twitterAccessToken = (token as any).twitterAccessToken;
        (session.user as any).linkedinAccessToken = (token as any).linkedinAccessToken;
        (session.user as any).facebookAccessToken = (token as any).facebookAccessToken;
      }
      return session;
    },
  },
});