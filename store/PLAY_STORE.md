# crawlspark.ai — Google Play packet

Use this file when creating the Play Console listing and wrapping the PWA as a Trusted Web Activity (TWA).

Canonical web origin: `https://www.crawlspark.ai`  
Privacy: `https://www.crawlspark.ai/privacy`  
Terms: `https://www.crawlspark.ai/terms`  
Account deletion: Settings → Danger zone, or `privacy@crawlspark.ai`  
Support: `support@crawlspark.ai`  
Package: `ai.crawlspark.app`

Do **not** wrap a broken production build. Confirm `https://www.crawlspark.ai/.well-known/assetlinks.json` returns JSON (not `/login`) before generating the TWA.

---

## Locked answers from Chris (2026-08-26)

| # | Item | Answer |
|---|------|--------|
| 1 | Public product name | **crawlspark.ai** |
| 2 | Support email | **support@crawlspark.ai** |
| 3 | TWA start URL | **https://www.crawlspark.ai** |
| 4 | Age rating | **18+ confirmed** |
| 5 | Play Console | **Organization account, not created yet** |
| 6 | Billing | **Website only** — Stripe or crypto. No Play in-app products. |
| 7 | Proceed | **Yes** — after production is green and assetlinks is public. |

Still needed from Chris after this deploy:

1. Create a Google Play Console **organization** account ($25 one-time).
2. After PWA Builder generates the upload keystore, run:
   `keytool -list -v -keystore upload-keystore.jks`
   and paste the SHA-256 into `public/.well-known/assetlinks.json`.
3. Capture **4–8 phone screenshots** at 1080×1920: dashboard checklist, Content Studio, library/calendar, Settings → Delete account.
4. **Feature graphic** 1024×500 PNG (or we generate one).
5. Point `support@crawlspark.ai` at an inbox Chris monitors.
6. Do not submit until production builds and assetlinks is public JSON.

---

## Listing copy

### App name (30)
crawlspark.ai

### Short description (80)
Crawl your site. Generate on-brand social posts. Schedule and publish.

### Full description

crawlspark.ai turns your website into a content workspace.

Add your domain. We crawl pages, images, and brand language, then generate posts for LinkedIn, X, Instagram, Facebook, Pinterest, and email. Save them in a post library, drop them on a calendar, and publish through connected accounts or a share link.

What you can do
- Crawl your site and extract brand voice
- Generate single posts or campaign packs
- Match crawled images or create AI visuals
- Schedule on a drag-and-drop calendar
- Connect social accounts or open a share sheet
- Optional Creator Studio avatars for video clips

This app is the installable website. Subscriptions (Pro, Enterprise) are sold on crawlspark.ai through Stripe or crypto — not as Google Play in-app products.

You must be 18 or older. Delete your account in Settings → Danger zone.

Privacy: https://www.crawlspark.ai/privacy
Terms: https://www.crawlspark.ai/terms
Support: support@crawlspark.ai

### Category
Business (primary) / Productivity (secondary)

### Content rating
Social communication + AI-generated content. Target age **18+**.

---

## How to package (TWA)

1. Wait until production is green.
2. Confirm https://www.crawlspark.ai/.well-known/assetlinks.json is public JSON.
3. https://www.pwabuilder.com → enter https://www.crawlspark.ai
4. Generate Android TWA package.
5. Put cert SHA-256 in `public/.well-known/assetlinks.json` and deploy.
6. Upload AAB to **internal testing** first.
7. Confirm no Chrome URL bar, then promote.

Keep billing on the website. Do not add Play Billing SKUs that duplicate Stripe.

---

## Data safety form (draft)

Collected for app functionality:
- Name, email, user IDs (account)
- User-generated content / crawled site text (shared with xAI, OpenAI when generating)
- Photos/videos (Vercel Blob; Replicate if you render video)
- Audio voiceovers (ElevenLabs, Vercel Blob)
- Purchase history if you pay by card (Stripe)
- Session cookie

Not collected: precise location, contacts, SMS, ads ID.
Sold: No.
Deletion: Settings → Danger zone or privacy@crawlspark.ai.
Children: 18+ only.

Processors: Vercel, Neon, Stripe, Resend, xAI, OpenAI, Replicate, ElevenLabs, plus social APIs you connect.
