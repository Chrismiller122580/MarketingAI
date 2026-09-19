"use client";

import { useSession } from "next-auth/react";
import { usePosts } from "@/context/posts-context";
import { canUseCreatorTools } from "@/lib/plans";

export function useCreatorAccess() {
  const { data: session, status } = useSession();
  const { posts, loading: postsLoading } = usePosts();
  const publishedCount = posts.filter(
    (p) => p.publishStatus === "published",
  ).length;

  const planAllowed = canUseCreatorTools(session?.user);
  const allowed = canUseCreatorTools(session?.user, { publishedCount });
  const ready = status !== "loading" && (planAllowed || !postsLoading);

  return { allowed, ready, publishedCount, planAllowed };
}
