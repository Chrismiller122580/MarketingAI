"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  CampaignPack,
  GeneratedPost,
  PublishResult,
  SavedPost,
} from "@/lib/types";

const POSTS_KEY = "marketing-ai-posts";
const PACKS_KEY = "marketing-ai-packs";

type PostsContextValue = {
  posts: SavedPost[];
  packs: CampaignPack[];
  savePost: (post: GeneratedPost) => SavedPost;
  deletePost: (id: string) => void;
  schedulePost: (id: string, date: string | undefined) => void;
  markPublished: (id: string, result: PublishResult) => void;
  publishPost: (id: string) => Promise<PublishResult>;
  savePack: (name: string, posts: SavedPost[]) => CampaignPack;
  deletePack: (id: string) => void;
  clearAll: () => void;
};

const PostsContext = createContext<PostsContextValue | null>(null);

function loadPosts(): SavedPost[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(POSTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadPacks(): CampaignPack[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PACKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function PostsProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [packs, setPacks] = useState<CampaignPack[]>([]);

  useEffect(() => {
    setPosts(loadPosts());
    setPacks(loadPacks());
  }, []);

  const persistPosts = useCallback((next: SavedPost[]) => {
    setPosts(next);
    localStorage.setItem(POSTS_KEY, JSON.stringify(next));
  }, []);

  const persistPacks = useCallback((next: CampaignPack[]) => {
    setPacks(next);
    localStorage.setItem(PACKS_KEY, JSON.stringify(next));
  }, []);

  const savePost = useCallback(
    (post: GeneratedPost): SavedPost => {
      const saved: SavedPost = {
        ...post,
        id: post.id ?? makeId(),
        createdAt: post.createdAt ?? new Date().toISOString(),
        publishStatus: post.publishStatus ?? "draft",
      };
      persistPosts([saved, ...posts.filter((p) => p.id !== saved.id)]);
      return saved;
    },
    [posts, persistPosts],
  );

  const deletePost = useCallback(
    (id: string) => {
      persistPosts(posts.filter((p) => p.id !== id));
    },
    [posts, persistPosts],
  );

  const schedulePost = useCallback(
    (id: string, date: string | undefined) => {
      persistPosts(
        posts.map((p) =>
          p.id === id
            ? {
                ...p,
                scheduledFor: date,
                publishStatus: date ? ("scheduled" as const) : ("draft" as const),
              }
            : p,
        ),
      );
    },
    [posts, persistPosts],
  );

  const markPublished = useCallback(
    (id: string, result: PublishResult) => {
      persistPosts(
        posts.map((p) =>
          p.id === id
            ? {
                ...p,
                publishStatus: result.success ? ("published" as const) : ("failed" as const),
                publishedAt: result.publishedAt ?? new Date().toISOString(),
                publishUrl: result.url,
              }
            : p,
        ),
      );
    },
    [posts, persistPosts],
  );

  const publishPostById = useCallback(
    async (id: string): Promise<PublishResult> => {
      const post = posts.find((p) => p.id === id);
      if (!post) {
        return {
          success: false,
          platform: "twitter",
          method: "api",
          message: "Post not found",
        };
      }

      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post }),
      });

      const result = (await response.json()) as PublishResult;
      markPublished(id, result);
      return result;
    },
    [posts, markPublished],
  );

  const savePack = useCallback(
    (name: string, packPosts: SavedPost[]): CampaignPack => {
      const pack: CampaignPack = {
        id: makeId(),
        name,
        createdAt: new Date().toISOString(),
        posts: packPosts,
      };
      persistPacks([pack, ...packs]);
      return pack;
    },
    [packs, persistPacks],
  );

  const deletePack = useCallback(
    (id: string) => {
      persistPacks(packs.filter((p) => p.id !== id));
    },
    [packs, persistPacks],
  );

  const clearAll = useCallback(() => {
    persistPosts([]);
    persistPacks([]);
  }, [persistPosts, persistPacks]);

  const value = useMemo(
    () => ({
      posts,
      packs,
      savePost,
      deletePost,
      schedulePost,
      markPublished,
      publishPost: publishPostById,
      savePack,
      deletePack,
      clearAll,
    }),
    [
      posts,
      packs,
      savePost,
      deletePost,
      schedulePost,
      markPublished,
      publishPostById,
      savePack,
      deletePack,
      clearAll,
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