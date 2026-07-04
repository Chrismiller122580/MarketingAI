export type IntegrationGuide = {
  id: string;
  category: "ai" | "social";
  name: string;
  envVars: string[];
  summary: string;
  steps: string[];
  docsUrl?: string;
};

export const INTEGRATION_GUIDES: IntegrationGuide[] = [
  {
    id: "openai",
    category: "ai",
    name: "OpenAI",
    envVars: ["OPENAI_API_KEY"],
    summary: "Powers AI copy (GPT-4o mini) and image generation (GPT Image).",
    steps: [
      "Go to platform.openai.com → API keys → Create new secret key.",
      "Add OPENAI_API_KEY to .env locally or Vercel → Settings → Environment Variables.",
      "Redeploy on Vercel after saving. Check Settings → AI features shows ✓.",
    ],
    docsUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "replicate",
    category: "ai",
    name: "Replicate",
    envVars: ["REPLICATE_API_TOKEN"],
    summary:
      "Powers AI video for Reels, Video Ads, video Stories (Seedance), and ViraForge influencer motion (Kling + SadTalker).",
    steps: [
      "Go to replicate.com → Account → API tokens → Create token.",
      "Add REPLICATE_API_TOKEN to .env locally or Vercel → Settings → Environment Variables.",
      "Redeploy on Vercel after saving. Reels, Video Ads, video Stories, and Creator Studio motion clips will be enabled.",
    ],
    docsUrl: "https://replicate.com/account/api-tokens",
  },
  {
    id: "elevenlabs",
    category: "ai",
    name: "ElevenLabs",
    envVars: ["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID"],
    summary:
      "Natural TTS for ViraForge talking clips (SadTalker lip-sync) and Content Studio MP3 voiceovers on Reels, Video Ads, and video Stories.",
    steps: [
      "Sign in at elevenlabs.io → Developers → API keys → Create key (or Profile → API Keys).",
      "Add ELEVENLABS_API_KEY to .env locally or Vercel → Settings → Environment Variables.",
      "Optional: elevenlabs.io/app/voice-library → copy a Voice ID → set ELEVENLABS_VOICE_ID.",
      "ViraForge: Talk motion clips also need REPLICATE_API_TOKEN. Voice previews are saved in Creator Studio → Render Library.",
      "Content Studio: MP3 narration on video posts also needs BLOB_READ_WRITE_TOKEN (Vercel Blob).",
      "Redeploy on Vercel after saving. Refresh Integrations — ELEVENLABS_API_KEY should show Active.",
    ],
    docsUrl: "https://elevenlabs.io/app/settings/api-keys",
  },
  {
    id: "xai",
    category: "ai",
    name: "xAI (Grok)",
    envVars: ["XAI_API_KEY"],
    summary:
      "Alternative to OpenAI — uses Grok for copy and Grok image generation.",
    steps: [
      "Go to console.x.ai → API keys → Create key.",
      "Add XAI_API_KEY to .env or Vercel env vars.",
      "If both OpenAI and xAI are set, both write copy in parallel — the app compares and recommends the best variant.",
      "Redeploy after adding the key.",
    ],
    docsUrl: "https://console.x.ai/",
  },
  {
    id: "twitter",
    category: "social",
    name: "X / Twitter",
    envVars: ["TWITTER_ACCESS_TOKEN", "TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET"],
    summary:
      "Direct posting to X. Supports manual user token OR full OAuth 2.0 with Client ID/Secret for 'Connect with X'. App-only bearer token is accepted as limited global fallback.",
    steps: [
      "In Twitter Developer Portal, create a Project + App with OAuth 2.0 User authentication.",
      "Enable scopes: tweet.read, tweet.write, users.read, offline.access.",
      "Copy your App's Client ID and Client Secret and set TWITTER_CLIENT_ID + TWITTER_CLIENT_SECRET.",
      "Option A (simple global): Generate a user access token manually and set TWITTER_ACCESS_TOKEN.",
      "Option B (recommended for multi-client): Users/clients connect their own X account via the per-site 'Connect with X' buttons (requires the Client credentials above).",
      "TWITTER_BEARER_TOKEN (the AAAA... app-only token) is supported but cannot post — publishing will use share links instead.",
      "Redeploy. Settings will show connection status.",
    ],
    docsUrl: "https://developer.x.com/en/docs/authentication/oauth-2-0",
  },
  {
    id: "linkedin",
    category: "social",
    name: "LinkedIn",
    envVars: ["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_AUTHOR_URN"],
    summary: "Publish posts via LinkedIn UGC Posts API.",
    steps: [
      "Create an app at linkedin.com/developers with Share on LinkedIn product.",
      "Generate an access token with w_member_social permission.",
      "Find your author URN: urn:li:person:YOUR_ID (or urn:li:organization:ID for company pages).",
      "Set LINKEDIN_ACCESS_TOKEN and LINKEDIN_AUTHOR_URN in Vercel env vars.",
      "Redeploy and verify connection in Settings.",
    ],
    docsUrl: "https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin",
  },
  {
    id: "facebook",
    category: "social",
    name: "Facebook",
    envVars: [
      "FACEBOOK_PAGE_ACCESS_TOKEN",
      "FACEBOOK_PAGE_ID",
      "FACEBOOK_CLIENT_ID",
      "FACEBOOK_CLIENT_SECRET",
      "FACEBOOK_LOGIN_CONFIG_ID",
    ],
    summary:
      "Publish to a Facebook Page via Graph API. Use env tokens globally, or OAuth per site.",
    steps: [
      "Create a Meta app at developers.facebook.com → add Facebook Login + Pages API.",
      "Facebook Login → Configurations → Valid OAuth Redirect URIs: paste https://www.crawlspark.ai/api/auth/callback/facebook in the list field, Save, then use Redirect URI Validator.",
      "Option A (global): generate a long-lived Page access token + set FACEBOOK_PAGE_ACCESS_TOKEN and FACEBOOK_PAGE_ID.",
      "Option B (per-site): set FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET, and FACEBOOK_LOGIN_CONFIG_ID (from Facebook Login → Configurations), then use Connect with Facebook on a loaded site.",
      "Redeploy and verify in Settings → Integrations.",
      "In App Dashboard → Settings → Basic, set Data Deletion Callback URL to https://www.crawlspark.ai/api/facebook/data-deletion (use www — apex redirects)",
    ],
    docsUrl: "https://developers.facebook.com/docs/pages-api/getting-started",
  },
  {
    id: "instagram",
    category: "social",
    name: "Instagram",
    envVars: [
      "INSTAGRAM_CLIENT_ID",
      "INSTAGRAM_CLIENT_SECRET",
      "INSTAGRAM_ACCESS_TOKEN",
      "INSTAGRAM_ACCOUNT_ID",
    ],
    summary:
      "Instagram Business/Creator via Meta Graph API. OAuth per-site or global Page token.",
    steps: [
      "Convert to Instagram Business or Creator and link to a Facebook Page.",
      "In Meta app, add Instagram Graph API + Facebook Login products.",
      "Set INSTAGRAM_CLIENT_ID + INSTAGRAM_CLIENT_SECRET (Instagram App ID in dashboard).",
      "OAuth redirect: https://www.crawlspark.ai/api/auth/callback/instagram",
      "Option A: Connect with Instagram on a loaded site (recommended).",
      "Option B: Set INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_ACCOUNT_ID globally.",
      "Find IG Account ID: GET /{page-id}?fields=instagram_business_account",
    ],
    docsUrl: "https://developers.facebook.com/docs/instagram-api/getting-started",
  },
  {
    id: "pinterest",
    category: "social",
    name: "Pinterest",
    envVars: [
      "PINTEREST_ACCESS_TOKEN",
      "PINTEREST_BOARD_ID",
      "PINTEREST_CLIENT_ID",
      "PINTEREST_CLIENT_SECRET",
    ],
    summary: "Create pins via Pinterest API v5. Global tokens or per-site OAuth.",
    steps: [
      "Create an app at developers.pinterest.com.",
      "OAuth redirect: https://www.crawlspark.ai/api/auth/callback/pinterest",
      "Option A (global): token with boards:read + pins:write, set PINTEREST_ACCESS_TOKEN + PINTEREST_BOARD_ID.",
      "Option B (per-site): set PINTEREST_CLIENT_ID + PINTEREST_CLIENT_SECRET, then Connect Pinterest on a loaded site.",
      "Redeploy and verify in Settings.",
    ],
    docsUrl: "https://developers.pinterest.com/docs/getting-started/authentication/",
  },
  {
    id: "email",
    category: "social",
    name: "Email (Resend)",
    envVars: ["RESEND_API_KEY", "EMAIL_FROM", "EMAIL_DEFAULT_TO"],
    summary: "Send email newsletters via Resend API, or mailto drafts per site.",
    steps: [
      "Create an account at resend.com and verify your sending domain.",
      "Set RESEND_API_KEY and EMAIL_FROM (e.g. hello@yourdomain.com).",
      "Optional: EMAIL_DEFAULT_TO for a global fallback recipient.",
      "Per-site: use Set email recipient on a loaded site in Settings.",
      "Without Resend, publishing opens a pre-filled mailto draft.",
    ],
    docsUrl: "https://resend.com/docs/api-reference/emails/send-email",
  },
];

export function getTwitterToken(): string | undefined {
  return process.env.TWITTER_ACCESS_TOKEN ?? process.env.TWITTER_BEARER_TOKEN;
}

/** True when only the app-only bearer token is present (no user access token with write scope). */
export function isTwitterBearerOnly(): boolean {
  return !process.env.TWITTER_ACCESS_TOKEN && !!process.env.TWITTER_BEARER_TOKEN;
}

export function hasTwitterOAuthCredentials(): boolean {
  return !!(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET);
}

export function getAiProvider(): "openai" | "xai" | null {
  if (process.env.XAI_API_KEY) return "xai";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

export function getAiImageProvider(): "openai" | "xai" | null {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.XAI_API_KEY) return "xai";
  return null;
}

export function getAiVideoProvider(): "replicate" | null {
  if (process.env.REPLICATE_API_TOKEN) return "replicate";
  return null;
}

export function getAiVoiceProvider(): "elevenlabs" | null {
  if (process.env.ELEVENLABS_API_KEY?.trim()) return "elevenlabs";
  return null;
}