"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSite } from "@/context/site-context";
import { usePosts } from "@/context/posts-context";

export function AppLoader({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const { loading: siteLoading } = useSite();
  const { loading: postsLoading } = usePosts();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    if (status === "loading") return;
    if (status === "unauthenticated") {
      setReady(true);
      return;
    }
    if (status === "authenticated" && !siteLoading && !postsLoading) {
      setReady(true);
    }
  }, [ready, status, siteLoading, postsLoading]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-crawl-700 to-spark-500 text-lg font-bold text-white animate-pulse">
            C
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Loading crawlspark.ai…
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
