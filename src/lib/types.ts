export type SiteImage = {
  url: string;
  alt: string;
  source: "og" | "twitter" | "hero" | "content";
  pageUrl: string;
  pagePath: string;
  score: number;
};

export type BrandProfile = {
  name: string;
  tagline: string;
  keywords: string[];
  tone: string;
  topics: string[];
  themeColor: string;
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
  | "pinterest";

export type ContentType =
  | "Social Post"
  | "Email Copy"
  | "Ad Headline"
  | "Blog Intro"
  | "Product Description";

export type UserSettings = {
  brandVoice: string;
  targetAudience: string;
  defaultPlatforms: Platform[];
  includeHashtags: boolean;
  emojiStyle: "none" | "light" | "heavy";
};

export type GeneratedPost = {
  id?: string;
  createdAt?: string;
  text: string;
  hashtags: string[];
  cta: string;
  platform: Platform;
  contentType: ContentType;
  image: {
    url: string;
    source: "site" | "branded" | "ai";
    alt: string;
    originalUrl?: string;
  };
  insights: string[];
  sourcePage?: string;
  characterCount: number;
  scheduledFor?: string;
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

export type GenerateRequest = {
  site: SiteData;
  contentType: ContentType;
  platform: Platform;
  prompt?: string;
  sourcePageUrl?: string;
  settings?: UserSettings;
};

export type BatchGenerateRequest = {
  site: SiteData;
  settings?: UserSettings;
  prompt?: string;
  platforms?: Platform[];
  maxPosts?: number;
};