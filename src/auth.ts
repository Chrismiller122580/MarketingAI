import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Twitter from "next-auth/providers/twitter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getAppOrigin } from "@/lib/app-url";

// Ensure NextAuth uses the canonical domain (not per-deployment VERCEL_URL).
if (!process.env.AUTH_URL && !process.env.NEXTAUTH_URL) {
  process.env.AUTH_URL = getAppOrigin();
}

const authSecret =
  process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

// Loose typing helpers to avoid `any` while supporting extended NextAuth JWT/session fields
type ExtToken = Record<string, unknown>;
type ExtUser = Record<string, unknown>;

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
      authorization: {
        url: "https://www.facebook.com/v19.0/dialog/oauth",
        params: process.env.FACEBOOK_LOGIN_CONFIG_ID
          ? { config_id: process.env.FACEBOOK_LOGIN_CONFIG_ID }
          : {
              scope:
                "pages_show_list,pages_manage_posts,pages_read_engagement",
            },
      },
      token: "https://graph.facebook.com/v19.0/oauth/access_token",
      userinfo: "https://graph.facebook.com/v19.0/me?fields=id,name,email",
      profile(profile) {
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
        };
      },
    },
    {
      id: "pinterest",
      name: "Pinterest",
      type: "oauth",
      clientId: process.env.PINTEREST_CLIENT_ID,
      clientSecret: process.env.PINTEREST_CLIENT_SECRET,
      authorization: {
        url: "https://www.pinterest.com/oauth/",
        params: {
          scope: "boards:read,pins:write,user_accounts:read",
        },
      },
      token: "https://api.pinterest.com/v5/oauth/token",
      userinfo: {
        url: "https://api.pinterest.com/v5/user_account",
        async request(context: { tokens: { access_token?: string } }) {
          const res = await fetch("https://api.pinterest.com/v5/user_account", {
            headers: {
              Authorization: `Bearer ${context.tokens.access_token ?? ""}`,
            },
          });
          return { data: await res.json() };
        },
      },
      profile(profile) {
        return {
          id: profile.username ?? profile.id ?? "pinterest-user",
          name: profile.username ?? "Pinterest",
          email: null,
        };
      },
    },
    {
      id: "instagram",
      name: "Instagram",
      type: "oauth",
      clientId:
        process.env.INSTAGRAM_CLIENT_ID ?? process.env.FACEBOOK_CLIENT_ID,
      clientSecret:
        process.env.INSTAGRAM_CLIENT_SECRET ??
        process.env.FACEBOOK_CLIENT_SECRET,
      authorization: {
        url: "https://www.facebook.com/v19.0/dialog/oauth",
        params: process.env.INSTAGRAM_LOGIN_CONFIG_ID
          ? { config_id: process.env.INSTAGRAM_LOGIN_CONFIG_ID }
          : {
              scope:
                "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement",
            },
      },
      token: "https://graph.facebook.com/v19.0/oauth/access_token",
      userinfo: "https://graph.facebook.com/v19.0/me?fields=id,name,email",
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
    async jwt({ token, user, account, trigger }) {
      const tt = token as ExtToken;
      const SOCIAL_PROVIDERS = [
        "twitter",
        "linkedin",
        "facebook",
        "instagram",
        "pinterest",
      ];

      // Only credentials login establishes identity — never replace id from OAuth
      if (account?.provider === "credentials" && user?.id) {
        token.id = user.id;
        if (user.role) token.role = user.role as string;
        const u = user as unknown as ExtUser;
        if (u.plan) tt.plan = u.plan;
        if (u.subscriptionStatus !== undefined) {
          tt.subscriptionStatus = u.subscriptionStatus;
        }
        if (u.subscriptionEndsAt !== undefined) {
          tt.subscriptionEndsAt = u.subscriptionEndsAt;
        }
      }

      async function refreshSubscriptionFromDb(userId: string) {
        const fresh = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            plan: true,
            subscriptionStatus: true,
            subscriptionEndsAt: true,
            role: true,
          },
        });
        if (fresh) {
          tt.plan = fresh.plan;
          tt.subscriptionStatus = fresh.subscriptionStatus;
          tt.subscriptionEndsAt =
            fresh.subscriptionEndsAt?.toISOString() ?? null;
          token.role = fresh.role;
        }
      }

      // Social OAuth is for linking tokens only — preserve paid plan from DB
      if (
        account &&
        SOCIAL_PROVIDERS.includes(account.provider) &&
        token.id
      ) {
        await refreshSubscriptionFromDb(token.id as string);
      }

      // Refresh plan from DB after Stripe checkout, billing, or session.update()
      if (trigger === "update" && token.id) {
        await refreshSubscriptionFromDb(token.id as string);
      }

      // Store OAuth tokens for social platforms (per user, will be linked to specific sites)
      if (account?.provider === "twitter") {
        (token as ExtToken).twitterAccessToken = account.access_token;
        (token as ExtToken).twitterRefreshToken = account.refresh_token;
      }
      if (account?.provider === "linkedin") {
        (token as ExtToken).linkedinAccessToken = account.access_token;
        (token as ExtToken).linkedinRefreshToken = account.refresh_token;
      }
      if (account?.provider === "facebook") {
        (token as ExtToken).facebookAccessToken = account.access_token;
        (token as ExtToken).facebookRefreshToken = account.refresh_token;
      }
      if (account?.provider === "instagram") {
        (token as ExtToken).instagramAccessToken = account.access_token;
        (token as ExtToken).instagramRefreshToken = account.refresh_token;
      }
      if (account?.provider === "pinterest") {
        (token as ExtToken).pinterestAccessToken = account.access_token;
        (token as ExtToken).pinterestRefreshToken = account.refresh_token;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "user";
        const su = (session.user ?? {}) as unknown as ExtUser;
        const tt = token as ExtToken;
        su.plan = (tt.plan as string) ?? "free";
        su.subscriptionStatus = (tt.subscriptionStatus as string) ?? null;
        su.subscriptionEndsAt = tt.subscriptionEndsAt as string | null | undefined;

        // Expose social tokens on session (used for linking to specific sites)
        su.twitterAccessToken = tt.twitterAccessToken;
        su.linkedinAccessToken = tt.linkedinAccessToken;
        su.facebookAccessToken = tt.facebookAccessToken;
        su.instagramAccessToken = tt.instagramAccessToken;
        su.pinterestAccessToken = tt.pinterestAccessToken;
      }
      return session;
    },
  },
});