export type SiteImage = {
  url: string;
  alt: string;
  source: "og" | "twitter" | "hero" | "content";
  pageUrl: string;
  pagePath: string;
  score: number;
};

export type BusinessModelType =
  | "saas"
  | "ecommerce"
  | "services"
  | "agency"
  | "media"
  | "local"
  | "nonprofit"
  | "other";

export type BusinessModel = {
  type: BusinessModelType;
  market: "b2b" | "b2c" | "both";
  valueProposition: string;
  revenueModel: string;
  conversionGoal: string;
  differentiators: string[];
  painPoints: string[];
};

export type BrandProfile = {
  name: string;
  tagline: string;
  keywords: string[];
  tone: string;
  topics: string[];
  themeColor: string;
  businessModel?: BusinessModel;
};

export type AiProvider = "openai" | "xai";

export type AiVariant = {
  provider: AiProvider;
  text: string;
  label: string;
};

export type SitePage = {
  url: string;
  path: string;
  title: string;
  description: string;
  headings: string[];
  excerpt: string;
  images: SiteImage[];
  ogImage?: string;
};

export type SiteData = {
  domain: string;
  crawledAt: string;
  brand: BrandProfile;
  pages: SitePage[];
  images: SiteImage[];
};

export type CrawlStatus = "idle" | "loading" | "success" | "error";

export type Platform =
  | "instagram"
  | "twitter"
  | "linkedin"
  | "facebook"
  | "pinterest"
  | "email";

export type ContentType =
  | "Social Post"
  | "Email Copy"
  | "Ad Headline"
  | "Blog Intro"
  | "Product Description"
  | "Video Ad";

export type VideoAspectRatio = "9:16" | "16:9" | "1:1";

export type PostMedia = {
  url: string;
  source: "site" | "branded" | "ai";
  alt: string;
  originalUrl?: string;
  videoUrl?: string;
  videoStatus?: "processing" | "ready" | "failed";
  videoJobId?: string;
  durationSec?: number;
  aspectRatio?: VideoAspectRatio;
};

export type PublishStatus = "draft" | "scheduled" | "published" | "failed";

export type UserSettings = {
  brandVoice: string;
  targetAudience: string;
  defaultPlatforms: Platform[];
  includeHashtags: boolean;
  emojiStyle: "none" | "light" | "heavy";
  preferAiImages: boolean;
};

export type GeneratedPost = {
  id?: string;
  createdAt?: string;
  text: string;
  hashtags: string[];
  cta: string;
  platform: Platform;
  contentType: ContentType;
  image: PostMedia;
  insights: string[];
  sourcePage?: string;
  characterCount: number;
  scheduledFor?: string;
  publishStatus?: PublishStatus;
  publishedAt?: string;
  publishUrl?: string;
  aiVariants?: AiVariant[];
  selectedProvider?: AiProvider;
  aiRecommendation?: AiProvider;
};

export type SavedPost = GeneratedPost & {
  id: string;
  createdAt: string;
};

export type CampaignPack = {
  id: string;
  name: string;
  createdAt: string;
  posts: SavedPost[];
};

import type { VisualTargeting } from "./visual-targeting";

export type { VisualTargeting };

export type GenerateRequest = {
  site: SiteData;
  contentType: ContentType;
  platform: Platform;
  prompt?: string;
  sourcePageUrl?: string;
  settings?: UserSettings;
  preferAiImage?: boolean;
  videoDuration?: 5 | 10;
  visualTargeting?: VisualTargeting;
};

export type VideoJobStatus = {
  jobId: string;
  status: "processing" | "ready" | "failed";
  videoUrl?: string;
  error?: string;
  prompt?: string;
  aspectRatio?: VideoAspectRatio;
};

export type BatchGenerateRequest = {
  site: SiteData;
  settings?: UserSettings;
  prompt?: string;
  platforms?: Platform[];
  maxPosts?: number;
  preferAiImage?: boolean;
  visualTargeting?: VisualTargeting;
};

export type PublishRequest = {
  post: SavedPost;
  scheduleAt?: string;
  twitterAccessToken?: string; // optional per-user token
};

export type PublishResult = {
  success: boolean;
  platform: Platform;
  method: "api" | "share_link" | "scheduled";
  message: string;
  url?: string;
  publishedAt?: string;
};

export type SocialConnectionStatus = {
  platform: Platform;
  connected: boolean;
  method: "api" | "manual";
  label: string;
};