# crawlspark.ai

AI-powered marketing workspace that crawls your website, extracts brand voice and content, and generates platform-ready posts with images — then schedules and publishes them from one dashboard.

**Live flow:** Landing page → Sign up → Crawl domain → Generate posts → Schedule → Publish

## Features

- **Full-site crawl** — Index pages, images, keywords, and brand signals from any domain
- **Smart content generation** — Platform-native copy grounded in crawled site content
- **Image matching** — Auto-match site images to posts, or generate branded visuals with AI
- **Campaign packs** — Batch-generate up to 15 posts for launches, promos, or campaigns
- **Post library** — Save, edit, and organize generated content
- **Content calendar** — Drag-and-drop scheduling across platforms
- **Social publishing** — Direct API publishing or share-link fallback per platform
- **Analytics overview** — Content pipeline stats, platform breakdown, site index metrics
- **Admin dashboard** — Platform stats, user management, role promotion/demotion
- **User auth** — Email/password signup and login with per-user data isolation

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL via [Neon](https://neon.tech) + Prisma 6 |
| Auth | NextAuth.js v5 (Auth.js) — credentials, JWT sessions |
| Crawling | cheerio |
| Calendar | @dnd-kit |

## Getting Started

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) PostgreSQL database (pooled connection URL recommended for serverless)

### 1. Clone and install

```bash
git clone https://github.com/Chrismiller122580/MarketingAI.git
cd MarketingAI
npm install
```

### 2. Configure environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Required variables:

```bash
DATABASE_URL=postgresql://...   # Neon pooled URL
AUTH_SECRET=...                 # openssl rand -base64 32
AUTH_URL=http://localhost:3000  # Your app URL (production URL on Vercel)
```

### 3. Set up the database

```bash
npm run db:push    # Apply schema to Neon
npm run db:seed    # Create admin account + default settings
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the landing page, or [http://localhost:3000/dashboard](http://localhost:3000/dashboard) after signing in.

## Default Admin Account

Created by `npm run db:seed` (override via env vars):

| Field | Default |
|-------|---------|
| Email | `admin@crawlspark.ai` |
| Password | `CrawlSpark2026!` |

Customize with `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` in `.env`.

## Environment Variables

See [`.env.example`](.env.example) for the full list. Step-by-step setup for AI and social APIs: **[INTEGRATIONS.md](INTEGRATIONS.md)**.

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string (use pooled URL on Vercel) |
| `AUTH_SECRET` | Secret for signing JWTs — `openssl rand -base64 32` |
| `AUTH_URL` | Canonical app URL (e.g. `https://crawlspark.ai`) |

### Optional — AI generation

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for copy and image generation |
| `XAI_API_KEY` | xAI API key (alternative image provider) |

### Optional — Direct social publishing

| Variable | Platform |
|----------|----------|
| `TWITTER_BEARER_TOKEN` | X / Twitter |
| `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_AUTHOR_URN` | LinkedIn |
| `FACEBOOK_PAGE_ACCESS_TOKEN`, `FACEBOOK_PAGE_ID` | Facebook |
| `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_ACCOUNT_ID` | Instagram |
| `PINTEREST_ACCESS_TOKEN`, `PINTEREST_BOARD_ID` | Pinterest |

Without social tokens, publishing falls back to share-ready links.

## Deploy on Vercel

1. Push the repo to GitHub and import it in [Vercel](https://vercel.com).
2. Add environment variables in **Project → Settings → Environment Variables**:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_URL` (your production URL, e.g. `https://crawlspark.ai`)
3. Deploy. The `vercel-build` script runs `prisma db push`, seeds the admin account, and builds the app.

```bash
# vercel-build (runs automatically on Vercel)
prisma generate && prisma db push --accept-data-loss && npm run db:seed && next build
```

4. **Redeploy** after adding or changing env vars — they only apply to new deployments.

> **Note:** `vercel-build` uses `--accept-data-loss` for schema sync. For production schema changes, prefer explicit migrations.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Generate Prisma client and production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:seed` | Seed admin user and default settings |
| `npm run db:studio` | Open Prisma Studio |

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Public landing page
│   ├── dashboard/            # Main app dashboard
│   ├── campaigns/            # Campaign pack generator
│   ├── content/              # Single post content studio
│   ├── posts/                # Post library + calendar
│   ├── analytics/            # Site and content analytics
│   ├── settings/             # Brand voice and platform prefs
│   ├── admin/                # Admin-only dashboard
│   ├── login/ & signup/      # Auth pages
│   └── api/                  # REST API routes
├── components/               # UI components
├── context/                  # React context (site, posts, settings)
├── lib/                      # Crawl, generation, publishing, DB helpers
├── auth.ts                   # NextAuth configuration
└── middleware.ts             # Route protection
prisma/
├── schema.prisma             # Database models
└── seed.ts                   # Admin seed script
```

## Routes

| Path | Access | Description |
|------|--------|-------------|
| `/` | Public | Marketing landing page |
| `/login`, `/signup` | Public | Authentication |
| `/dashboard` | Auth | Main workspace |
| `/content` | Auth | Single post generator |
| `/campaigns` | Auth | Campaign pack generator |
| `/posts` | Auth | Post library and calendar |
| `/analytics` | Auth | Content and site analytics |
| `/settings` | Auth | User preferences |
| `/admin` | Admin | Platform stats and user management |

## API Overview

| Endpoint | Description |
|----------|-------------|
| `POST /api/crawl` | Crawl a domain and store site data |
| `POST /api/generate` | Generate a single post |
| `POST /api/generate/batch` | Generate a campaign pack |
| `POST /api/publish` | Publish a post to social platforms |
| `GET/POST /api/db/site` | User's crawled site data |
| `GET/POST /api/db/posts` | User's saved posts |
| `GET/POST /api/db/packs` | Campaign packs |
| `GET/PUT /api/db/settings` | User settings |
| `GET /api/admin/stats` | Admin platform statistics |
| `PATCH /api/admin/users/[id]/role` | Promote/demote user roles |

## License

Private project. All rights reserved.