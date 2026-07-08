import { resolvePostMedia } from "./blob-storage";
import type {
  CampaignPack,
  GeneratedPost,
  SavedPost,
  SiteData,
  UserSettings,
} from "./types";
import type { PostMedia } from "./types";

export function siteToData(row: {
  domain: string;
  crawledAt: Date;
  brand: unknown;
  pages: unknown;
  images: unknown;
}): SiteData {
  return {
    domain: row.domain,
    crawledAt: row.crawledAt.toISOString(),
    brand: row.brand as SiteData["brand"],
    pages: row.pages as SiteData["pages"],
    images: row.images as SiteData["images"],
  };
}

export function postToSaved(row: {
  id: string;
  text: string;
  hashtags: string[];
  cta: string;
  platform: string;
  contentType: string;
  image: unknown;
  insights: string[];
  sourcePage: string | null;
  characterCount: number;
  scheduledFor: string | null;
  publishStatus: string;
  publishedAt: Date | null;
  publishUrl: string | null;
  externalPostId?: string | null;
  performance?: unknown;
  aiVariants?: unknown;
  selectedProvider?: string | null;
  originalText?: string | null;
  influencerId?: string | null;
  createdAt: Date;
}): SavedPost {
  return {
    id: row.id,
    text: row.text,
    hashtags: row.hashtags,
    cta: row.cta,
    platform: row.platform as SavedPost["platform"],
    contentType: row.contentType as SavedPost["contentType"],
    image: resolvePostMedia(row.image as PostMedia),
    insights: row.insights,
    sourcePage: row.sourcePage ?? undefined,
    characterCount: row.characterCount,
    scheduledFor: row.scheduledFor ?? undefined,
    publishStatus: row.publishStatus as SavedPost["publishStatus"],
    publishedAt: row.publishedAt?.toISOString(),
    publishUrl: row.publishUrl ?? undefined,
    externalPostId: row.externalPostId ?? undefined,
    performance: row.performance as SavedPost["performance"],
    aiVariants: row.aiVariants as SavedPost["aiVariants"],
    selectedProvider: row.selectedProvider as SavedPost["selectedProvider"],
    originalText: row.originalText ?? undefined,
    influencerId: row.influencerId ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export function packToData(row: {
  id: string;
  name: string;
  posts: unknown;
  createdAt: Date;
}): CampaignPack {
  const posts = row.posts as SavedPost[];
  return {
    id: row.id,
    name: row.name,
    posts: posts.map((post) => ({
      ...post,
      image: resolvePostMedia(post.image),
    })),
    createdAt: row.createdAt.toISOString(),
  };
}

export function settingsToData(row: {
  brandVoice: string;
  targetAudience: string;
  defaultPlatforms: string[];
  includeHashtags: boolean;
  emojiStyle: string;
  preferAiImages: boolean;
  promptPreferences?: unknown;
  creatorPreferences?: unknown;
  activeSiteDomain?: string | null;
  activeSiteChosen?: boolean;
}): UserSettings {
  return {
    brandVoice: row.brandVoice,
    targetAudience: row.targetAudience,
    defaultPlatforms: row.defaultPlatforms as UserSettings["defaultPlatforms"],
    includeHashtags: row.includeHashtags,
    emojiStyle: row.emojiStyle as UserSettings["emojiStyle"],
    preferAiImages: row.preferAiImages,
    promptPreferences: row.promptPreferences as UserSettings["promptPreferences"],
    creatorPreferences: row.creatorPreferences as UserSettings["creatorPreferences"],
    activeSiteDomain: row.activeSiteDomain ?? null,
    activeSiteChosen: row.activeSiteChosen ?? false,
  };
}

export function postFromGenerated(
  post: GeneratedPost | SavedPost,
  siteId?: string,
) {
  return {
    siteId: siteId ?? null,
    text: post.text,
    hashtags: post.hashtags,
    cta: post.cta,
    platform: post.platform,
    contentType: post.contentType,
    image: post.image,
    insights: post.insights,
    sourcePage: post.sourcePage ?? null,
    characterCount: post.characterCount,
    scheduledFor: post.scheduledFor ?? null,
    publishStatus: post.publishStatus ?? "draft",
    publishedAt: post.publishedAt ? new Date(post.publishedAt) : null,
    publishUrl: post.publishUrl ?? null,
    ...(post.aiVariants && { aiVariants: post.aiVariants }),
    ...(post.selectedProvider && { selectedProvider: post.selectedProvider }),
    originalText: post.originalText ?? post.text,
    influencerId: post.influencerId ?? null,
  };
}