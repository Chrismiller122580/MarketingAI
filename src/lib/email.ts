import { Resend } from "resend";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  idempotencyKey?: string;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const PLAIN_EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

/**
 * Resend requires `email@domain.com` or `Name <email@domain.com>`.
 * Vercel env values often arrive quoted, prefixed, or as "Name email@x"
 * without angle brackets — all of which 422.
 */
export function normalizeEmailFrom(raw: string | undefined): string | null {
  if (!raw) return null;

  let value = raw
    .replace(/^\uFEFF/, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"')
    .replace(/[\u00A0]/g, " ")
    .replace(/^[`'"]+|[`'"]+$/g, "")
    .replace(/^mailto:/i, "")
    .replace(/^EMAIL_FROM\s*=\s*/i, "")
    .replace(/\s+#.*$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[`'"]+|[`'"]+$/g, "");

  if (!value) return null;
  if (PLAIN_EMAIL.test(value)) return value;

  const named = value.match(
    /^(.*?)<\s*([^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)\s*>\s*$/,
  );
  if (named) {
    const email = named[2];
    const name = named[1]
      .trim()
      .replace(/^[`'"]+|[`'"]+$/g, "")
      .replace(/[<>]/g, "")
      .trim();
    if (!name) return email;
    if (/^[A-Za-z0-9 ._-]+$/.test(name)) return `${name} <${email}>`;
    return email;
  }

  const loose = value.match(
    /^(.*?)\s+([^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)\s*$/,
  );
  if (loose && PLAIN_EMAIL.test(loose[2])) {
    const email = loose[2];
    const name = loose[1].replace(/[<>]/g, "").trim();
    if (name && /^[A-Za-z0-9 ._-]+$/.test(name)) return `${name} <${email}>`;
    return email;
  }

  const embedded = value.match(/[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+/);
  if (embedded && PLAIN_EMAIL.test(embedded[0])) return embedded[0];

  const domainOnly = value.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  if (/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(domainOnly) && !domainOnly.includes("/")) {
    return `hello@${domainOnly}`;
  }

  return null;
}

export function isResendConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

export function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">");
  return escaped
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export async function sendViaResend(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const from =
    normalizeEmailFrom(process.env.EMAIL_FROM) ??
    (process.env.EMAIL_FROM?.trim()
      ? "CrawlSpark <hello@crawlspark.ai>"
      : null);
  const client = getResendClient();

  if (!client) {
    return { ok: false, error: "RESEND_API_KEY must be set." };
  }

  if (!from) {
    return {
      ok: false,
      error:
        "EMAIL_FROM must be an address like hello@crawlspark.ai or CrawlSpark <hello@crawlspark.ai>.",
    };
  }

  const { data, error } = await client.emails.send(
    {
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html ?? textToHtml(input.text),
    },
    input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data?.id) {
    return { ok: false, error: "Resend returned no message id." };
  }

  return { ok: true, id: data.id };
}
