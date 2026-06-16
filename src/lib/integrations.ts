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
    summary: "Powers AI copy (GPT-4o mini) and image generation (DALL·E 3).",
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
      "Powers AI video ad generation (Seedance text-to-video) for short-form marketing creatives.",
    steps: [
      "Go to replicate.com → Account → API tokens → Create token.",
      "Add REPLICATE_API_TOKEN to .env locally or Vercel → Settings → Environment Variables.",
      "Redeploy on Vercel after saving. Video Ad generation in Content Studio will be enabled.",
    ],
    docsUrl: "https://replicate.com/account/api-tokens",
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
      "If both OpenAI and xAI are set, xAI is preferred for copy generation.",
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
    envVars: ["PINTEREST_ACCESS_TOKEN", "PINTEREST_BOARD_ID"],
    summary: "Create pins via Pinterest API v5.",
    steps: [
      "Create an app at developers.pinterest.com.",
      "Generate an access token with boards:read and pins:write scopes.",
      "List boards: GET https://api.pinterest.com/v5/boards — copy target board_id.",
      "Set PINTEREST_ACCESS_TOKEN and PINTEREST_BOARD_ID in Vercel.",
      "Redeploy and verify in Settings.",
    ],
    docsUrl: "https://developers.pinterest.com/docs/getting-started/authentication/",
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