"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSite } from "./site-context";
import type {
  CampaignPack,
  GeneratedPost,
  PublishResult,
  SavedPost,
} from "@/lib/types";

type PostsContextValue = {
  posts: SavedPost[];
  packs: CampaignPack[];
  loading: boolean;
  savePost: (post: GeneratedPost) => Promise<SavedPost>;
  deletePost: (id: string) => Promise<void>;
  schedulePost: (id: string, date: string | undefined) => Promise<void>;
  publishPost: (id: string) => Promise<PublishResult>;
  savePack: (name: string, posts: SavedPost[]) => Promise<CampaignPack>;
  deletePack: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
};

const PostsContext = createContext<PostsContextValue | null>(null);

export function PostsProvider({ children }: { children: React.ReactNode }) {
  const { site } = useSite();
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [packs, setPacks] = useState<CampaignPack[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [postsRes, packsRes] = await Promise.all([
        fetch("/api/db/posts"),
        fetch("/api/db/packs"),
      ]);
      const postsData = await postsRes.json();
      const packsData = await packsRes.json();
      if (postsData.posts) setPosts(postsData.posts);
      if (packsData.packs) setPacks(packsData.packs);
    } catch {
      /* keep existing state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const savePost = useCallback(
    async (post: GeneratedPost): Promise<SavedPost> => {
      const response = await fetch("/api/db/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post,
          siteDomain: site?.domain,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to save post");
      setPosts((prev) => [data.post, ...prev.filter((p) => p.id !== data.post.id)]);
      return data.post;
    },
    [site?.domain],
  );

  const deletePost = useCallback(async (id: string) => {
    await fetch(`/api/db/posts/${id}`, { method: "DELETE" });
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const schedulePost = useCallback(
    async (id: string, date: string | undefined) => {
      const response = await fetch(`/api/db/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledFor: date ?? null }),
      });
      const data = await response.json();
      if (data.post) {
        setPosts((prev) =>
          prev.map((p) => (p.id === id ? data.post : p)),
        );
      }
    },
    [],
  );

  const publishPostById = useCallback(
    async (id: string): Promise<PublishResult> => {
      const response = await fetch(`/api/db/posts/${id}`, { method: "POST" });
      const data = await response.json();
      if (data.post) {
        setPosts((prev) =>
          prev.map((p) => (p.id === id ? data.post : p)),
        );
      }
      return data.result ?? data;
    },
    [],
  );

  const savePack = useCallback(
    async (name: string, packPosts: SavedPost[]): Promise<CampaignPack> => {
      const response = await fetch("/api/db/packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, posts: packPosts }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to save pack");
      setPacks((prev) => [data.pack, ...prev]);
      return data.pack;
    },
    [],
  );

  const deletePack = useCallback(async (id: string) => {
    await fetch(`/api/db/packs/${id}`, { method: "DELETE" });
    setPacks((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clearAll = useCallback(async () => {
    await Promise.all([
      fetch("/api/db/posts", { method: "DELETE" }),
      fetch("/api/db/packs", { method: "DELETE" }),
    ]);
    setPosts([]);
    setPacks([]);
  }, []);

  const value = useMemo(
    () => ({
      posts,
      packs,
      loading,
      savePost,
      deletePost,
      schedulePost,
      publishPost: publishPostById,
      savePack,
      deletePack,
      clearAll,
      refresh,
    }),
    [
      posts,
      packs,
      loading,
      savePost,
      deletePost,
      schedulePost,
      publishPostById,
      savePack,
      deletePack,
      clearAll,
      refresh,
    ],
  );

  return (
    <PostsContext.Provider value={value}>{children}</PostsContext.Provider>
  );
}

export function usePosts() {
  const context = useContext(PostsContext);
  if (!context) {
    throw new Error("usePosts must be used within PostsProvider");
  }
  return context;
}