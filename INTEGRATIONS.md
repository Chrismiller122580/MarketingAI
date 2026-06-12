# crawlspark.ai — Integrations Setup

Configure API keys as **environment variables** in Vercel or your local `.env` file. After adding or changing variables on Vercel, **redeploy** — env vars only apply to new deployments.

Check connection status in the app: **Settings → Integrations overview**.

---

## Quick reference

| Integration | Environment variables |
|-------------|----------------------|
| OpenAI | `OPENAI_API_KEY` |
| xAI (Grok) | `XAI_API_KEY` |
| X / Twitter | `TWITTER_ACCESS_TOKEN` |
| LinkedIn | `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_AUTHOR_URN` |
| Facebook | `FACEBOOK_PAGE_ACCESS_TOKEN`, `FACEBOOK_PAGE_ID` |
| Instagram | `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_ACCOUNT_ID` |
| Pinterest | `PINTEREST_ACCESS_TOKEN`, `PINTEREST_BOARD_ID` |

---

## Vercel setup

1. Go to [Vercel Dashboard](https://vercel.com) → your project → **Settings** → **Environment Variables**
2. Add each key for **Production** (and **Preview** if you want preview deploys to work)
3. Go to **Deployments** → latest → **⋯** → **Redeploy**
4. Open your app → **Settings** — connected integrations show green

For local development:

```bash
cp .env.example .env
# Edit .env with your keys
npm run dev
```

---

## AI — copy and images

### OpenAI (`OPENAI_API_KEY`)

- **Copy:** GPT-4o mini via Chat Completions API
- **Images:** DALL·E 3

**Steps:**
1. Create an account at [platform.openai.com](https://platform.openai.com)
2. **API keys** → **Create new secret key**
3. Add billing if required
4. Set `OPENAI_API_KEY=sk-...` in Vercel or `.env`

### xAI (`XAI_API_KEY`)

- **Copy:** Grok models
- **Images:** xAI image API

**Steps:**
1. Sign up at [console.x.ai](https://console.x.ai)
2. Create an API key
3. Set `XAI_API_KEY=xai-...` in Vercel or `.env`

**Note:** If both OpenAI and xAI are set, **xAI is preferred for copy**. OpenAI is preferred for images when both are available.

---

## Social publishing

Platforms without API credentials still work via **share links** when you publish.

### X / Twitter (`TWITTER_ACCESS_TOKEN`)

Direct posting requires an **OAuth 2.0 user access token** with `tweet.write` scope — not an app-only bearer token.

**Steps:**
1. Create a developer account at [developer.x.com](https://developer.x.com)
2. Create a Project and App with **OAuth 2.0** user authentication
3. Enable scopes: `tweet.read`, `tweet.write`, `users.read`, `offline.access`
4. Complete the OAuth authorization flow to get a user access token
5. Set `TWITTER_ACCESS_TOKEN` in Vercel

`TWITTER_BEARER_TOKEN` (the long `AAAAAAAAAAAAAAAA...` app-only token) is supported as a **limited global fallback**.

- If only a bearer token is configured (no `TWITTER_ACCESS_TOKEN` and no per-site OAuth token for the post), the app will **automatically fall back to share links** with a clear message instead of attempting a write that would 403.
- For real posting capability, use a proper user access token or (preferred) per-client "Connect with X" OAuth.

### LinkedIn (`LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_AUTHOR_URN`)

**Steps:**
1. Create an app at [linkedin.com/developers](https://www.linkedin.com/developers/)
2. Add **Share on LinkedIn** product
3. Generate an access token with `w_member_social` permission
4. Set author URN:
   - Personal: `urn:li:person:YOUR_MEMBER_ID`
   - Company page: `urn:li:organization:YOUR_ORG_ID`
5. Set both env vars in Vercel

### Facebook (`FACEBOOK_PAGE_ACCESS_TOKEN`, `FACEBOOK_PAGE_ID`)

**Steps:**
1. Create a Meta app at [developers.facebook.com](https://developers.facebook.com)
2. Add **Facebook Login** and **Pages API**
3. Connect your Facebook Page and generate a **long-lived Page access token**
4. Find Page ID under Page Settings → About
5. Set both env vars in Vercel

### Instagram (`INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_ACCOUNT_ID`)

Requires an **Instagram Business or Creator** account linked to a Facebook Page.

**Steps:**
1. Link Instagram to a Facebook Page
2. In your Meta app, add **Instagram Graph API**
3. Use a Page access token with `instagram_basic` and `instagram_content_publish`
4. Get Instagram Account ID:
   ```
   GET https://graph.facebook.com/v19.0/{page-id}?fields=instagram_business_account
   ```
5. Set `INSTAGRAM_ACCESS_TOKEN` and `INSTAGRAM_ACCOUNT_ID`

Instagram publishing may require completing steps in Meta Business Suite depending on your account setup.

### Pinterest (`PINTEREST_ACCESS_TOKEN`, `PINTEREST_BOARD_ID`)

**Steps:**
1. Create an app at [developers.pinterest.com](https://developers.pinterest.com)
2. Generate a token with `boards:read` and `pins:write` scopes
3. List boards to get `board_id`:
   ```
   GET https://api.pinterest.com/v5/boards
   ```
4. Set both env vars in Vercel

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Settings still shows "Not configured" after adding keys | Redeploy on Vercel — env vars don't update running deployments |
| Twitter returns 403 | Use OAuth 2.0 **user** token with `tweet.write` (or per-site Connect with X). App-only bearer is now auto-fallen back to share links. |
| LinkedIn returns 401 | Token expired — regenerate; check `w_member_social` scope |
| AI copy uses templates only | No `OPENAI_API_KEY` or `XAI_API_KEY` set — app falls back to rule-based generation |
| AI images unavailable | Set `OPENAI_API_KEY` (DALL·E) or `XAI_API_KEY` |

---

## Security

- Never commit `.env` or paste live keys in chat
- Rotate keys if exposed
- Use Vercel env vars for production — not hardcoded values
- Prefer scoped tokens with minimum required permissions