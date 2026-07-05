import { getAppOrigin } from "@/lib/app-url";
import { isResendConfigured, sendViaResend } from "@/lib/email";

export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isResendConfigured()) {
    const msg = "Email is not configured (RESEND_API_KEY and EMAIL_FROM).";
    if (process.env.NODE_ENV === "development") {
      console.warn(`[auth-email] ${msg} Reset link: ${getAppOrigin()}/reset-password?token=${token}`);
    }
    return { ok: false, error: msg };
  }

  const resetUrl = `${getAppOrigin()}/reset-password?token=${encodeURIComponent(token)}`;
  const result = await sendViaResend({
    to: email,
    subject: "Reset your crawlspark.ai password",
    text: `Reset your password by visiting this link (expires in 1 hour):\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    idempotencyKey: `reset-${email}-${token.slice(0, 8)}`,
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isResendConfigured()) {
    const msg = "Email is not configured (RESEND_API_KEY and EMAIL_FROM).";
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[auth-email] ${msg} Verify link: ${getAppOrigin()}/api/auth/verify-email?token=${token}`,
      );
    }
    return { ok: false, error: msg };
  }

  const verifyUrl = `${getAppOrigin()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const result = await sendViaResend({
    to: email,
    subject: "Verify your crawlspark.ai email",
    text: `Welcome to crawlspark.ai! Verify your email by visiting:\n\n${verifyUrl}\n\nThis link expires in 24 hours.`,
    idempotencyKey: `verify-${email}-${token.slice(0, 8)}`,
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}