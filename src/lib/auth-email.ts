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
        `[auth-email] ${msg} Verify link: ${getAppOrigin()}/verify-email?token=${token}`,
      );
    }
    return { ok: false, error: msg };
  }

  const verifyUrl = `${getAppOrigin()}/verify-email?token=${encodeURIComponent(token)}`;
  const result = await sendViaResend({
    to: email,
    subject: "Verify your crawlspark.ai email",
    text: `Welcome to crawlspark.ai!\n\nVerify your email by opening this link (expires in 24 hours):\n\n${verifyUrl}\n\nIf you did not create an account, you can ignore this email.`,
    html: verificationHtml(verifyUrl),
    idempotencyKey: `verify-${email}-${token.slice(0, 8)}`,
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

function verificationHtml(verifyUrl: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#d97706;">crawlspark.ai</p>
                <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Verify your email</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#475569;">
                  Confirm this address so you can keep using crawlspark.ai. The link expires in 24 hours.
                </p>
                <p style="margin:0 0 24px;">
                  <a href="${verifyUrl}" style="display:inline-block;background:#d97706;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:10px;">
                    Verify email
                  </a>
                </p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;">
                  If the button does not work, paste this URL into your browser:<br />
                  ${verifyUrl}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}