import Link from "next/link";

export default function PrivacyPolicy() {
  const lastUpdated = "June 15, 2026";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Simple public header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-crawl-700 to-spark-500 text-sm font-bold text-white">
              C
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              crawlspark.ai
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/domains" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
              Domains
            </Link>
            <Link href="/login" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Last updated: {lastUpdated}
          </p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            crawlspark.ai (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and AI-powered marketing platform (the &quot;Service&quot;).
          </p>

          <h2>1. Information We Collect</h2>
          <p>We collect the following types of information:</p>
          <ul>
            <li>
              <strong>Account Information:</strong> When you register, we collect your name, email address, and password (stored as a secure hash).
            </li>
            <li>
              <strong>Website Data:</strong> When you provide a domain, we crawl and temporarily process pages, images, text, headings, and metadata from that site to generate brand insights and content. This data is stored per your account.
            </li>
            <li>
              <strong>Generated Content:</strong> Posts, campaign packs, edits, and scheduling data you create using the Service.
            </li>
            <li>
              <strong>Usage and Analytics:</strong> Information about how you interact with the Service (pages visited, features used, crawl and generation activity).
            </li>
            <li>
              <strong>Payment Information:</strong> For crypto payments, we record transaction hashes, amounts, references, plan selections, and associated wallet references you submit. We do not store private keys or full wallet access.
            </li>
            <li>
              <strong>Technical Data:</strong> IP address, browser type, device information, and cookies for authentication and basic functionality.
            </li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve the Service (crawling, AI generation, scheduling, publishing).</li>
            <li>Personalize your experience based on the brand data from your crawled sites.</li>
            <li>Process payments and manage subscriptions.</li>
            <li>Communicate with you (account updates, support, important notices).</li>
            <li>Detect and prevent fraud, abuse, or security issues.</li>
            <li>Analyze usage to improve our AI models and product (using aggregated or anonymized data where possible).</li>
          </ul>

          <h2>3. How We Share Your Information</h2>
          <p>We do not sell your personal information. We may share data in these limited cases:</p>
          <ul>
            <li>
              <strong>Service Providers:</strong> With hosting (Vercel), database (Neon), and AI providers (xAI, OpenAI) as necessary to deliver the Service. When we send data to AI providers, it is used only for processing your specific request.
            </li>
            <li>
              <strong>Legal Requirements:</strong> If required by law, court order, or to protect our rights and users.
            </li>
            <li>
              <strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets (you will be notified).
            </li>
            <li>
              <strong>With Your Consent:</strong> For any other purpose with your explicit permission.
            </li>
          </ul>
          <p>Your generated content remains private to your account unless you choose to publish it to social platforms using your own credentials.</p>

          <h2>4. Data Security</h2>
          <p>We implement reasonable technical and organizational measures to protect your data, including encryption in transit, secure password hashing, and access controls. However, no method of transmission or storage is 100% secure. You are responsible for keeping your account credentials confidential.</p>

          <h2>5. Data Retention</h2>
          <p>We retain your account and associated data (sites, posts, settings) as long as your account is active or as needed to provide the Service. You may delete your data at any time through the app or by contacting us. We may retain certain information for legal or legitimate business purposes (e.g., fraud prevention, billing records) after account deletion.</p>

          <h2>6. Your Rights and Choices</h2>
          <p>Depending on your location, you may have the following rights:</p>
          <ul>
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your data (&quot;right to be forgotten&quot;).</li>
            <li>Request a copy of your data in a portable format.</li>
            <li>Object to or restrict certain processing.</li>
            <li>Withdraw consent where processing is based on consent.</li>
          </ul>
          <p>To exercise these rights, use the in-app tools (Settings, delete account flows) or email us at the address below. We will respond within a reasonable time and in accordance with applicable law.</p>

          <h3>Facebook / Meta data deletion</h3>
          <p>
            If you connected crawlspark.ai with Facebook Login or linked a Facebook Page,
            you can request deletion of Facebook-related data we store (OAuth tokens and
            Page connection records) in either of these ways:
          </p>
          <ul>
            <li>
              <strong>Via Facebook:</strong> Go to Facebook Settings → Apps and Websites,
              remove crawlspark.ai, and click <strong>Send Request</strong>. Meta will
              notify us automatically. You will receive a confirmation code and a status
              link to track the request.
            </li>
            <li>
              <strong>Directly:</strong> Email{" "}
              <a href="mailto:privacy@crawlspark.ai" className="text-amber-600 hover:underline">
                privacy@crawlspark.ai
              </a>{" "}
              or visit our{" "}
              <Link href="/data-deletion" className="text-amber-600 hover:underline">
                data deletion status page
              </Link>{" "}
              with your confirmation code.
            </li>
          </ul>
          <p>
            Our automated data deletion callback URL for Meta App Review is:{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">
              https://crawlspark.ai/api/facebook/data-deletion
            </code>
          </p>

          <h2>7. Cookies and Tracking</h2>
          <p>We use essential cookies for authentication and session management. We may use basic analytics cookies to understand usage. You can control cookies through your browser settings. Our Service does not use third-party advertising cookies.</p>

          <h2>8. Children&apos;s Privacy</h2>
          <p>Our Service is not directed to children under 13 (or the applicable age in your jurisdiction). We do not knowingly collect personal information from children. If you believe we have collected such data, please contact us immediately.</p>

          <h2>9. International Data Transfers</h2>
          <p>Your information may be transferred to and processed in the United States and other countries where our service providers operate. We take steps to ensure adequate protection for your data in accordance with this policy and applicable law.</p>

          <h2>10. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on this page and updating the &quot;Last updated&quot; date. Your continued use of the Service after changes constitutes acceptance of the updated policy.</p>

          <h2>11. Contact Us</h2>
          <p>If you have questions, concerns, or requests regarding this Privacy Policy or your data, please contact us at:</p>
          <p className="not-prose mt-2">
            <strong>crawlspark.ai</strong><br />
            Email: <a href="mailto:privacy@crawlspark.ai" className="text-amber-600 hover:underline">privacy@crawlspark.ai</a>
          </p>

          <p className="mt-8 text-xs text-slate-500 dark:text-slate-400">
            This Privacy Policy is provided for informational purposes and does not constitute legal advice. Consult with a qualified attorney for advice specific to your situation.
          </p>
        </div>

        <div className="mt-12 border-t border-slate-200 pt-8 text-center dark:border-slate-800">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
            ← Back to crawlspark.ai
          </Link>
        </div>
      </main>
    </div>
  );
}
