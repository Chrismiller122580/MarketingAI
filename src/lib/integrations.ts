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
      "Direct posting to X. Supports manual user token OR full OAuth 2.0 with Client ID/Secret for 'Connect with X'.",
    steps: [
      "In Twitter Developer Portal, create a Project + App with OAuth 2.0 User authentication.",
      "Enable scopes: tweet.read, tweet.write, users.read, offline.access.",
      "Copy your App's Client ID and Client Secret and set TWITTER_CLIENT_ID + TWITTER_CLIENT_SECRET.",
      "Option A (simple): Generate a user access token manually and set TWITTER_ACCESS_TOKEN.",
      "Option B (recommended): Users can connect their own X account via Sign in with X (requires the Client credentials above).",
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
    envVars: ["FACEBOOK_PAGE_ACCESS_TOKEN", "FACEBOOK_PAGE_ID"],
    summary: "Publish to a Facebook Page via Graph API.",
    steps: [
      "Create a Meta app at developers.facebook.com with Pages API.",
      "Connect your Facebook Page and generate a long-lived Page access token.",
      "Copy the numeric Page ID from Page Settings → About.",
      "Set FACEBOOK_PAGE_ACCESS_TOKEN and FACEBOOK_PAGE_ID in Vercel.",
      "Redeploy and verify in Settings.",
    ],
    docsUrl: "https://developers.facebook.com/docs/pages-api/getting-started",
  },
  {
    id: "instagram",
    category: "social",
    name: "Instagram",
    envVars: ["INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_ACCOUNT_ID"],
    summary:
      "Instagram Business/Creator account via Meta Graph API (linked to a Facebook Page).",
    steps: [
      "Convert to Instagram Business or Creator and link to a Facebook Page.",
      "In Meta app, add Instagram Graph API product.",
      "Get Page access token with instagram_basic and instagram_content_publish.",
      "Find Instagram Account ID via Graph API: GET /{page-id}?fields=instagram_business_account.",
      "Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_ACCOUNT_ID in Vercel.",
      "Note: full auto-publish may require completing in Meta Business Suite.",
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