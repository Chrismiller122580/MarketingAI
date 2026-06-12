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
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user?.id) token.id = user.id;
      if (user?.role) token.role = user.role as string;

      // Propagate subscription fields
      if ((user as any)?.plan) token.plan = (user as any).plan;
      if ((user as any)?.subscriptionStatus !== undefined) token.subscriptionStatus = (user as any).subscriptionStatus;
      if ((user as any)?.subscriptionEndsAt !== undefined) token.subscriptionEndsAt = (user as any).subscriptionEndsAt;

      // Store Twitter OAuth token when user connects via X
      if (account?.provider === "twitter") {
        token.twitterAccessToken = account.access_token;
        token.twitterRefreshToken = account.refresh_token;
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

        // Expose Twitter token on session for publishing
        (session.user as any).twitterAccessToken = token.twitterAccessToken as string | undefined;
      }
      return session;
    },
  },
});