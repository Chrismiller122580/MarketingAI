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

export type BrandSynthesis = {
  voiceGuide: string;
  messagingPillars: string[];
  contentThemes: string[];
  doNotSay: string[];
  audiencePersona: string;
};

export type BrandProfile = {
  name: string;
  tagline: string;
  keywords: string[];
  tone: string;
  topics: string[];
  themeColor: string;
  businessModel?: BusinessModel;
  synthesis?: BrandSynthesis;
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
  embedding?: number[];
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
  | "Video Ad"
  | "Reel"
  | "Story";

export type ContentAngle =
  | "auto"
  | "question-hook"
  | "bold-claim"
  | "story"
  | "myth-buster"
  | "before-after"
  | "stat-led"
  | "contrarian"
  | "how-to"
  | "social-proof";

export type PostHistorySnapshot = {
  text: string;
  sourcePage?: string;
  platform: Platform;
};

export type UniquenessReport = {
  score: number;
  tips: string[];
  angle?: ContentAngle;
};

export type VideoAspectRatio = "9:16" | "16:9" | "1:1";

export type ImageOverlayTextLayer = {
  type: "text";
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  fontStyle?: "normal" | "bold";
  align?: "left" | "center" | "right";
  width?: number;
  rotation?: number;
  opacity?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOpacity?: number;
};

export type ImageOverlayImageLayer = {
  type: "image";
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  rotation?: number;
};

export type ImageOverlayShapeLayer = {
  type: "shape";
  id: string;
  shape: "rect" | "pill";
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  opacity: number;
  cornerRadius?: number;
  rotation?: number;
};

export type ImageOverlayLayer =
  | ImageOverlayTextLayer
  | ImageOverlayImageLayer
  | ImageOverlayShapeLayer;

export type PostMedia = {
  url: string;
  source: "site" | "branded" | "ai" | "edited" | "influencer";
  alt: string;
  originalUrl?: string;
  editedUrl?: string;
  originalBaseUrl?: string;
  overlays?: ImageOverlayLayer[];
  videoUrl?: string;
  videoStatus?: "processing" | "ready" | "failed";
  videoJobId?: string;
  durationSec?: number;
  aspectRatio?: VideoAspectRatio;
};

export type PublishStatus = "draft" | "scheduled" | "published" | "failed";

export type PromptPreferences = {
  preferredProvider?: AiProvider;
  providerCounts?: Partial<Record<AiProvider, number>>;
  styleHints?: string[];
  avgCaptionLength?: number;
};

export type CreatorPreferences = {
  preferredLocations?: string[];
  preferredReligions?: string[];
  preferredSocialClasses?: string[];
  avgBodyType?: number;
  defaultPlatforms?: string[];
  lastInfluencerId?: string;
};

export type UserSettings = {
  brandVoice: string;
  targetAudience: string;
  defaultPlatforms: Platform[];
  includeHashtags: boolean;
  emojiStyle: "none" | "light" | "heavy";
  preferAiImages: boolean;
  promptPreferences?: PromptPreferences;
  creatorPreferences?: CreatorPreferences;
};

export type ContentGapAnalysis = {
  underusedPages: { path: string; title: string }[];
  missingPlatforms: Platform[];
  uncoveredThemes: string[];
  recommendations: string[];
  platformBreakdown: Partial<Record<Platform, number>>;
  totalPosts: number;
  publishedPosts: number;
  pageCount: number;
  performance?: PerformanceSummary;
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
  externalPostId?: string;
  performance?: PostPerformance;
  aiVariants?: AiVariant[];
  selectedProvider?: AiProvider;
  aiRecommendation?: AiProvider;
  originalText?: string;
  contentAngle?: ContentAngle;
  uniqueness?: UniquenessReport;
};

export type SavedPost = GeneratedPost & {
  id: string;
  createdAt: string;
  originalText?: string;
};

export type CampaignPack = {
  id: string;
  name: string;
  createdAt: string;
  posts: SavedPost[];
};

import type { VisualTargeting } from "./visual-targeting";
import type { CreatorAvatarForm } from "./schemas/creator-avatar-schema";
import type { ProductFactsForm } from "./schemas/product-facts-schema";
import type { FactPinpoint } from "./viraforge/site-facts-extractor";
import type { InfluencerAssets } from "./viraforge/influencer-assets";

export type { VisualTargeting };

export type StoryMedia = "image" | "video";

export type InfluencerGenerateContext = {
  id: string;
  displayName: string;
  handle: string;
  persona: CreatorAvatarForm;
  facts: ProductFactsForm;
  pinpoints: FactPinpoint[];
  assets: InfluencerAssets;
};

export type GenerateRequest = {
  site: SiteData;
  contentType: ContentType;
  platform: Platform;
  prompt?: string;
  sourcePageUrl?: string;
  settings?: UserSettings;
  preferAiImage?: boolean;
  videoDuration?: 5 | 10;
  storyMedia?: StoryMedia;
  visualTargeting?: VisualTargeting;
  contentAngle?: ContentAngle;
  existingPosts?: PostHistorySnapshot[];
  influencer?: InfluencerGenerateContext;
  useInfluencerPortrait?: boolean;
  influencerVoice?: boolean;
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
  contentAngle?: ContentAngle;
  existingPosts?: PostHistorySnapshot[];
  varyAngles?: boolean;
};

export type PublishRequest = {
  post: SavedPost;
  scheduleAt?: string;
  twitterAccessToken?: string; // optional per-user token
};

export type PostPerformance = {
  impressions?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  clicks?: number;
  engagementRate?: number;
  fetchedAt?: string;
  source?: "api" | "unavailable";
};

export type PerformanceSummary = {
  totalPublished: number;
  withMetrics: number;
  totalImpressions: number;
  totalEngagements: number;
  avgEngagementRate: number;
  topPlatform?: Platform;
  topPostId?: string;
  platformStats: Partial<
    Record<
      Platform,
      {
        posts: number;
        impressions: number;
        engagements: number;
        avgEngagementRate: number;
      }
    >
  >;
  recommendations: string[];
  lastSyncedAt?: string;
};

export type PublishResult = {
  success: boolean;
  platform: Platform;
  method: "api" | "share_link" | "scheduled";
  message: string;
  url?: string;
  externalId?: string;
  publishedAt?: string;
};

export type SocialConnectionStatus = {
  platform: Platform;
  connected: boolean;
  method: "api" | "manual";
  label: string;
};