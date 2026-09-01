import Link from "next/link";
import { PublicNav } from "@/components/public-nav";

export default function TermsOfService() {
  const lastUpdated = "September 1, 2026";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PublicNav />

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Last updated: {lastUpdated}
          </p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of the crawlspark.ai website and platform (the &quot;Service&quot;) operated by crawlspark.ai (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). By accessing or using the Service, you agree to be bound by these Terms.
          </p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By creating an account or using the Service, you represent that you are at least 18 years old (or the age of majority in your jurisdiction) and have the legal capacity to enter into these Terms. If you are using the Service on behalf of an organization, you represent that you have authority to bind that organization.
          </p>

          <h2>2. Description of the Service</h2>
          <p>
            crawlspark.ai is an AI-powered marketing platform that allows users to crawl their own websites, extract brand voice, pages, images, and keywords, and generate platform-optimized social media posts, campaign packs, and other marketing content. The Service includes tools for editing, scheduling, and publishing content, as well as analytics and account management features.
          </p>
          <p>
            The Service uses artificial intelligence models (including from xAI and OpenAI) to generate content based on data you provide or authorize us to access.
          </p>

          <h2>3. User Accounts</h2>
          <p>
            You must create an account to use most features of the Service. You are responsible for:
          </p>
          <ul>
            <li>Providing accurate and complete information.</li>
            <li>Maintaining the confidentiality of your password.</li>
            <li>All activity that occurs under your account.</li>
          </ul>
          <p>
            You may not share your account credentials or allow others to use your account. Notify us immediately of any unauthorized use.
          </p>

          <h2>4. Your Content and License Grant</h2>
          <p>
            <strong>Ownership:</strong> You retain ownership of all content you submit to the Service (including website domains you provide for crawling) and all content you generate or edit using the Service (&quot;Your Content&quot;).
          </p>
          <p>
            <strong>License to Us:</strong> By using the Service, you grant us a worldwide, non-exclusive, royalty-free license to host, store, process, display, and use Your Content solely as necessary to provide, maintain, and improve the Service. This includes crawling websites you designate and using that data to generate marketing content.
          </p>
          <p>
            <strong>Responsibility:</strong> You are solely responsible for Your Content, including ensuring you have all necessary rights and permissions to crawl the websites you submit and to use the generated content as you intend (including for commercial purposes and publishing to social media).
          </p>
          <p>
            We do not claim ownership of AI-generated outputs. However, because the outputs are based on models trained on large datasets, similar or identical outputs may be generated for other users.
          </p>

          <h2>5. Prohibited Uses</h2>
          <p>You agree not to use the Service to:</p>
          <ul>
            <li>Violate any law, regulation, or third-party rights (including copyright, trademark, or privacy rights).</li>
            <li>Crawl or submit websites for which you do not have authorization or rights.</li>
            <li>Generate or distribute spam, misleading, defamatory, illegal, or harmful content.</li>
            <li>Attempt to reverse-engineer, decompile, or extract the underlying models or source code.</li>
            <li>Interfere with or disrupt the Service or servers.</li>
            <li>Use the Service for high-risk activities where failure could lead to death, personal injury, or catastrophic damage (the Service is not designed for such uses).</li>
          </ul>

          <h2>6. Intellectual Property</h2>
          <p>
            The Service, including all software, designs, text, graphics, and the &quot;crawlspark.ai&quot; name and logo, are owned by us or our licensors. Except for the limited license granted above for Your Content, these Terms do not grant you any rights to our intellectual property.
          </p>

          <h2>7. Payments and Subscriptions</h2>
          <p>
            A Free account includes one crawled website and 15 generated posts per calendar month (UTC), plus share-link publishing. Paid plans (Pro, Enterprise, and Enterprise Plus) unlock unlimited crawls and generations, calendar auto-publish, AI video, and (on Enterprise Plus) Creator Studio avatars. Current prices are shown on the homepage and Billing page.
          </p>
          <p>
            Card subscriptions are billed monthly through Stripe. You can cancel in Billing → Manage Stripe subscription; access continues through the paid period unless Stripe reports the subscription as fully canceled. Crypto (XRP on the XRP Ledger, or USDC where offered) is prepaid monthly and is generally non-refundable except as required by law. You are responsible for on-chain transactions from your wallet.
          </p>
          <p>
            Deleting your account cancels an active Stripe subscription. We may change pricing with reasonable notice.
          </p>

          <h2>8. AI-Generated Content Disclaimer</h2>
          <p>
            The Service uses artificial intelligence to generate content. AI outputs may contain inaccuracies, biases, or be unsuitable for your specific needs. You are solely responsible for reviewing, editing, and verifying all generated content before use or publication. We make no warranties regarding the accuracy, completeness, or fitness of AI-generated content for any particular purpose.
          </p>

          <h2>9. Termination</h2>
          <p>
            We may suspend or terminate your access to the Service at any time, with or without cause, including for violation of these Terms, non-payment, or suspected abuse. You may delete your account at any time through the Service.
          </p>
          <p>
            Upon termination, your right to use the Service ends immediately. We may retain certain data as described in our Privacy Policy.
          </p>

          <h2>10. Disclaimers</h2>
          <p>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
          </p>
          <p>
            We do not guarantee that the Service will be uninterrupted, secure, or error-free, or that results from using the Service (including AI outputs or publishing success) will meet your expectations.
          </p>

          <h2>11. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE AND OUR AFFILIATES, OFFICERS, EMPLOYEES, AGENTS, AND SUPPLIERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR BUSINESS OPPORTUNITIES, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), OR ANY OTHER LEGAL THEORY, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>
          <p>
            OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THE SERVICE OR THESE TERMS SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID TO US IN THE 12 MONTHS PRECEDING THE CLAIM OR (B) $100.
          </p>

          <h2>12. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless crawlspark.ai and its affiliates from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys&apos; fees) arising out of or related to your use of the Service, Your Content, or violation of these Terms.
          </p>

          <h2>13. Governing Law and Dispute Resolution</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the State of Georgia, United States, without regard to its conflict of laws principles. Any dispute arising out of or relating to these Terms or the Service shall be resolved exclusively in the state or federal courts located in Fulton County, Georgia, and you consent to personal jurisdiction there.
          </p>

          <h2>14. Miscellaneous</h2>
          <p>
            These Terms, together with our Privacy Policy, constitute the entire agreement between you and us regarding the Service. If any provision is found unenforceable, the remaining provisions will remain in effect. Our failure to enforce any right or provision shall not constitute a waiver.
          </p>

          <h2>15. Contact Us</h2>
          <p>
            For questions about these Terms, please contact us at:
          </p>
          <p className="not-prose mt-2">
            <strong>crawlspark.ai</strong><br />
            Email: <a href="mailto:legal@crawlspark.ai" className="text-amber-600 hover:underline">legal@crawlspark.ai</a>
          </p>

          <p className="mt-8 text-xs text-slate-500 dark:text-slate-400">
            These Terms of Service are provided for informational purposes and do not constitute legal advice. Consult with a qualified attorney for advice specific to your situation.
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
