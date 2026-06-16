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

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

export function isResendConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

export function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export async function sendViaResend(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const from = process.env.EMAIL_FROM?.trim();
  const client = getResendClient();

  if (!client || !from) {
    return {
      ok: false,
      error: "RESEND_API_KEY and EMAIL_FROM must be set.",
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