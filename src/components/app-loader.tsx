"use client";

import { useSession } from "next-auth/react";
import { useSite } from "@/context/site-context";
import { usePosts } from "@/context/posts-context";

export function AppLoader({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const { loading: siteLoading } = useSite();
  const { loading: postsLoading } = usePosts();

  const isLoading =
    status === "loading" || siteLoading || postsLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-crawl-700 to-spark-500 text-lg font-bold text-white animate-pulse">
            C
          </div>
          <p className="text-sm font-medium text-slate-700">
            Loading crawlspark.ai…
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}