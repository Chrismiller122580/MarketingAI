# crawlspark.ai — Google Play packet

Use this file when creating the Play Console listing and wrapping the PWA as a Trusted Web Activity (TWA).

Canonical web origin: `https://www.crawlspark.ai`  
App host (if split): `https://app.crawlspark.ai`  
Privacy: `https://www.crawlspark.ai/privacy`  
Terms: `https://www.crawlspark.ai/terms`  
Account deletion: Settings → Danger zone, or `privacy@crawlspark.ai`  
Suggested package: `ai.crawlspark.app`

Do **not** wrap a broken production build. Latest walk-talk typecheck on `162a30f` must be fixed first.

---

## What we still need from Chris

1. **Public product name.** Repo says crawlspark.ai. You also call it Crawlspace.ai. Listing, icon, and legal pages must use one name.
2. **Signing key SHA-256.** After PWA Builder creates the upload keystore:
   `keytool -list -v -keystore upload-keystore.jks`
   Paste into `public/.well-known/assetlinks.json`.
3. **TWA start URL.** Prefer `https://www.crawlspark.ai` (Meta OAuth already wants www).
4. **4–8 phone screenshots** (1080×1920): dashboard checklist, Content Studio, library/calendar, Settings → Delete account.
5. **Feature graphic** 1024×500 PNG.
6. **Support email** you monitor.
7. **Play Console account** and confirm **18+**.
8. Do not submit until production builds and `/api/publish` is auth-gated on the live SHA.

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

This app is the installable website. Subscriptions (Pro, Enterprise) are sold on crawlspark.ai through Stripe or XRP — not as Google Play in-app products.

You must be 18 or older. Delete your account in Settings → Danger zone.

Privacy: https://www.crawlspark.ai/privacy
Terms: https://www.crawlspark.ai/terms

### Category
Business (primary) / Productivity (secondary)

### Content rating
Social communication + AI-generated content. Target age **18+**.

---

## How to package (TWA)

1. Fix production typecheck.
2. https://www.pwabuilder.com → enter https://www.crawlspark.ai
3. Generate Android TWA package.
4. Put cert SHA-256 in `public/.well-known/assetlinks.json` and deploy.
5. Upload AAB to **internal testing** first.
6. Confirm no Chrome URL bar, then promote.

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
