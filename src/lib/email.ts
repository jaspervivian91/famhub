/**
 * Email Service — transactional emails via Resend
 *
 * SendGrid-style wrapper around the Resend API for all Family Hub
 * transactional emails (waitlist confirmations, password resets, etc.).
 */

import { Resend } from "resend";

const FROM_ADDRESS = "Family Hub <onboarding@resend.dev>";

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY is not set — email sending is disabled.",
      );
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export function hasResendKey(): boolean {
  return (
    typeof process.env.RESEND_API_KEY === "string" &&
    process.env.RESEND_API_KEY.length > 0
  );
}

// ---------------------------------------------------------------------------
// Waitlist
// ---------------------------------------------------------------------------

export async function sendWaitlistConfirmation(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  if (!hasResendKey()) return { success: false, error: "Email not configured" };

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: "You're on the Family Hub waitlist!",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
          <div style="font-size: 48px; text-align: center; margin-bottom: 16px;">🏠</div>
          <h1 style="color: #92400e; text-align: center; font-size: 24px; margin: 0 0 8px;">
            You're on the list!
          </h1>
          <p style="color: #57534e; text-align: center; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
            Thanks for joining the Family Hub waitlist. We'll let you know
            the moment we launch — and as an early member, you'll get
            premium features free for the first year.
          </p>
          <div style="background: #fef3c7; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <p style="color: #92400e; font-size: 14px; line-height: 1.5; margin: 0;">
              <strong>📬 Stay tuned</strong><br/>
              In the meantime, tell your family about Family Hub!
              The more people waiting, the better the launch.
            </p>
          </div>
          <p style="color: #a8a29e; text-align: center; font-size: 12px; margin: 0;">
            Family Hub — stay close to the people who matter, without social media.
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

export async function sendPasswordReset(
  email: string,
  resetLink: string,
): Promise<{ success: boolean; error?: string }> {
  if (!hasResendKey()) return { success: false, error: "Email not configured" };

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: "Reset your Family Hub password",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
          <div style="font-size: 48px; text-align: center; margin-bottom: 16px;">🏠</div>
          <h1 style="color: #92400e; text-align: center; font-size: 24px; margin: 0 0 8px;">
            Reset your password
          </h1>
          <p style="color: #57534e; text-align: center; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
            Click the link below to reset your Family Hub password.
            This link expires in 1 hour.
          </p>
          <a href="${resetLink}"
             style="display: block; background: #d97706; color: white; text-align: center;
                    padding: 14px 24px; border-radius: 12px; font-size: 16px; font-weight: 600;
                    text-decoration: none; margin-bottom: 24px;">
            Reset Password
          </a>
          <p style="color: #a8a29e; text-align: center; font-size: 12px; margin: 0;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
