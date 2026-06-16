import Link from "next/link";
import { LandingNav } from "./landing-nav";

const features = [
  {
    icon: "🌐",
    title: "Full-site crawl",
    description:
      "Index every page, image, and keyword from your domain. AI extracts brand voice, topics, and messaging automatically.",
  },
  {
    icon: "✦",
    title: "Smart content generation",
    description:
      "Generate platform-native posts grounded in your real site content — not generic filler copy.",
  },
  {
    icon: "🖼",
    title: "Image matching & AI visuals",
    description:
      "Auto-match crawled images to posts, or generate branded visuals with AI when you need something new.",
  },
  {
    icon: "◎",
    title: "Campaign packs",
    description:
      "Spin up 15 posts at once for product launches, seasonal promos, or thought leadership pushes.",
  },
  {
    icon: "▣",
    title: "Content calendar",
    description:
      "Drag-and-drop scheduling across platforms. See your pipeline at a glance.",
  },
  {
    icon: "↗",
    title: "One-click publishing",
    description:
      "Publish directly to social APIs, or get share-ready links when direct posting isn't configured.",
  },
];

const steps = [
  {
    step: "01",
    title: "Add your domain",
    description: "Enter your website URL. We crawl pages, images, and brand signals in seconds.",
  },
  {
    step: "02",
    title: "Generate content",
    description:
      "Create single posts or full campaign packs tailored to LinkedIn, X, Instagram, and more.",
  },
  {
    step: "03",
    title: "Schedule & publish",
    description:
      "Drop posts on your calendar and publish when you're ready — or ship immediately.",
  },
];

const platforms = [
  "LinkedIn",
  "X / Twitter",
  "Instagram",
  "Facebook",
  "Pinterest",
  "Email",
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <LandingNav />

      <main>
        <section className="relative overflow-hidden px-6 pb-24 pt-16 md:pb-32 md:pt-24">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-crawl-100/70 via-spark-200/50 to-transparent blur-3xl" />
          </div>

          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-crawl-100 bg-crawl-50 px-4 py-1.5 text-sm font-medium text-crawl-700">
                <span className="h-1.5 w-1.5 rounded-full bg-spark-500" />
                Crawl your site. Spark your content.
              </p>
              <div className="mb-3 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[1px] text-crawl-600 dark:text-crawl-400">
                <span>📱</span> Installable on Android &amp; iPhone
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl md:text-6xl">
                Turn your site into a{" "}
                <span className="bg-gradient-to-r from-crawl-700 to-spark-500 bg-clip-text text-transparent">
                  content engine
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
                Crawl your domain, generate on-brand posts with images, build
                campaign packs, and schedule publishing — all from one workspace.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/signup"
                  className="w-full rounded-xl bg-spark-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-spark-200 transition hover:bg-spark-700 sm:w-auto"
                >
                  Start free
                </Link>
                <Link
                  href="/login"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 py-3.5 text-base font-semibold text-slate-700 dark:text-slate-300 transition hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 sm:w-auto"
                >
                  Sign in
                </Link>
              </div>
            </div>

            <div className="relative mx-auto mt-16 max-w-4xl">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-2xl shadow-slate-200/60">
                <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-rose-400" />
                      <span className="h-3 w-3 rounded-full bg-amber-400" />
                      <span className="h-3 w-3 rounded-full bg-emerald-400" />
                    </div>
                    <div className="mx-auto rounded-md bg-slate-100 dark:bg-slate-800 px-4 py-1 text-xs text-slate-500 dark:text-slate-400">
                      app.crawlspark.ai/dashboard
                    </div>
                  </div>
                  <div className="grid gap-4 p-6 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Brand
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                        Acme Co.
                      </p>
                      <p className="mt-1 text-xs text-amber-600">
                        Professional · Friendly
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Pages indexed
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">47</p>
                      <p className="mt-1 text-xs text-emerald-600">
                        Full-site crawl
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Posts ready
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">12</p>
                      <p className="mt-1 text-xs text-teal-600">
                        Campaign pack
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:col-span-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Latest generated post
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        Excited to share how we&apos;re helping teams ship
                        marketing faster — grounded in real product pages, not
                        guesswork. 🚀
                      </p>
                      <div className="mt-3 flex gap-2">
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                          LinkedIn
                        </span>
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                          Scheduled · Tue 9am
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-crawl-800 to-spark-500 p-4 text-white">
                      <p className="text-sm font-medium">Content calendar</p>
                      <div className="mt-3 space-y-2">
                        {["Mon", "Tue", "Wed"].map((day, i) => (
                          <div
                            key={day}
                            className="flex items-center gap-2 rounded-lg bg-white dark:bg-slate-900/15 px-2 py-1.5 text-xs"
                          >
                            <span className="w-8 font-medium">{day}</span>
                            <span className="h-1.5 flex-1 rounded-full bg-white dark:bg-slate-900/30">
                              {i === 1 && (
                                <span className="block h-full w-2/3 rounded-full bg-white dark:bg-slate-900" />
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Everything you need to ship content
              </h2>
              <p className="mt-4 text-slate-600 dark:text-slate-300">
                From crawl to publish — one workflow, no context switching.
              </p>
            </div>
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-6 transition hover:border-amber-200 hover:shadow-md"
                >
                  <span className="text-2xl">{feature.icon}</span>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-t border-slate-200 dark:border-slate-800 px-6 py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Up and running in minutes
              </h2>
              <p className="mt-4 text-slate-600 dark:text-slate-300">
                No integrations to configure before you see value.
              </p>
            </div>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {steps.map((item) => (
                <div key={item.step} className="relative">
                  <span className="text-5xl font-bold text-crawl-100">
                    {item.step}
                  </span>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="platforms"
          className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-24"
        >
          <div className="mx-auto max-w-6xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Built for every channel
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-600 dark:text-slate-300">
              Generate and schedule content optimized for each platform&apos;s
              format, length, and tone.
            </p>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
              {platforms.map((platform) => (
                <span
                  key={platform}
                  className="rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  {platform}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing teaser for market readiness */}
        <section id="pricing" className="border-t border-slate-200 dark:border-slate-800 px-6 py-24 bg-slate-50 dark:bg-slate-950/50">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Simple, crypto-powered pricing</h2>
              <p className="mt-3 text-slate-600 dark:text-slate-400">Pay with XRP. Connect your wallet — verified payments activate instantly.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { name: "Free", price: "0", features: ["Basic generations", "1 site crawl", "Community support", "Manual publishing"], cta: "Get started", href: "/signup" },
                { name: "Pro", price: "29", features: ["Unlimited generations", "Unlimited sites", "Priority AI", "Content calendar & auto-publish", "Crypto billing"], cta: "Upgrade to Pro", href: "/signup", popular: true },
                { name: "Enterprise", price: "99", features: ["Everything in Pro", "Priority support", "Custom onboarding", "Volume pricing", "Dedicated account manager"], cta: "Contact sales", href: "/signup" },
              ].map((tier) => (
                <div key={tier.name} className={`card p-6 flex flex-col ${tier.popular ? 'ring-2 ring-amber-500' : ''}`}>
                  {tier.popular && <div className="text-[10px] uppercase tracking-widest text-amber-600 font-semibold mb-1">Most popular</div>}
                  <div className="text-xl font-semibold">{tier.name}</div>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-4xl font-bold">${tier.price}</span>
                    <span className="text-sm text-slate-500 ml-1">/mo</span>
                  </div>
                  <ul className="mt-6 space-y-2 text-sm flex-1">
                    {tier.features.map(f => <li key={f} className="flex items-center gap-2">✓ {f}</li>)}
                  </ul>
                  <Link href={tier.href} className={tier.popular ? "btn-primary mt-6 text-center" : "btn-secondary mt-6 text-center"}>
                    {tier.cta}
                  </Link>
                </div>
              ))}
            </div>
            <p className="text-center text-xs mt-6 text-slate-500">Billed in XRP on XRPL. Plans managed in your Billing page after signup.</p>
          </div>
        </section>

        <section className="border-t border-slate-200 dark:border-slate-800 px-6 py-24">
          <div className="mx-auto max-w-4xl rounded-2xl bg-gradient-to-br from-crawl-800 to-spark-600 px-8 py-16 text-center text-white shadow-xl shadow-crawl-200">
            <h2 className="text-3xl font-bold tracking-tight">
              Ready to market smarter?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-spark-100">
              Create your free account, crawl your site, and generate your first
              campaign pack today.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-block rounded-xl bg-white dark:bg-slate-900 px-8 py-3.5 text-base font-semibold text-crawl-800 transition hover:bg-spark-50"
            >
              Get started free
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-crawl-700 to-spark-500 text-xs font-bold text-white">
              C
            </div>
            <span className="font-semibold text-slate-900 dark:text-slate-100">crawlspark.ai</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} crawlspark.ai. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-slate-500 dark:text-slate-400">
            <Link href="/domains" className="hover:text-slate-900 dark:text-slate-100">
              Domains
            </Link>
            <Link href="/privacy" className="hover:text-slate-900 dark:text-slate-100">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-slate-900 dark:text-slate-100">
              Terms
            </Link>
            <Link href="/login" className="hover:text-slate-900 dark:text-slate-100">
              Sign in
            </Link>
            <Link href="/signup" className="hover:text-slate-900 dark:text-slate-100">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}