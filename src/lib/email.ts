/**
 * Email Service — transactional emails via Resend
 *
 * SendGrid-style wrapper around the Resend API for all Family Hub
 * transactional emails (waitlist confirmations, password resets, etc.).
 */

import { Resend } from "resend";
import type { Nudge } from "~/lib/types";
import type { DigestContent } from "~/lib/digest-engine";

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

// ---------------------------------------------------------------------------
// Nudge notification
// ---------------------------------------------------------------------------

const NUDGE_EMOJI: Record<string, string> = {
  dormancy: "⏰",
  cooling: "🌡️",
  celebration: "🎉",
  conversation_starter: "💬",
};

const NUDGE_LABEL: Record<string, string> = {
  dormancy: "Time to reconnect",
  cooling: "Staying in touch",
  celebration: "Celebrate the moment",
  conversation_starter: "Start a conversation",
};

export async function sendNudgeEmail(
  nudge: Nudge,
  memberEmail: string,
  memberName: string,
): Promise<{ success: boolean; error?: string }> {
  if (!hasResendKey()) return { success: false, error: "Email not configured" };

  const emoji = NUDGE_EMOJI[nudge.nudge_type] ?? "💌";
  const label = NUDGE_LABEL[nudge.nudge_type] ?? "A little nudge";

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: memberEmail,
      subject: `${emoji} ${label} — from Family Hub`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
          <div style="font-size: 48px; text-align: center; margin-bottom: 16px;">🏠</div>
          <h1 style="color: #92400e; text-align: center; font-size: 24px; margin: 0 0 8px;">
            ${emoji} ${label}
          </h1>
          <p style="color: #57534e; text-align: center; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
            Hi ${memberName || "there"}! Here's a little nudge from your family.
          </p>
          <div style="background: #fef3c7; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <p style="color: #92400e; font-size: 16px; line-height: 1.5; margin: 0;">
              ${nudge.message_text}
            </p>
          </div>
          <a href="https://familyhub.ctonew.app/dashboard"
             style="display: block; background: #d97706; color: white; text-align: center;
                    padding: 14px 24px; border-radius: 12px; font-size: 16px; font-weight: 600;
                    text-decoration: none; margin-bottom: 24px;">
            View on Dashboard →
          </a>
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
// Digest notification
// ---------------------------------------------------------------------------

export async function sendDigestEmail(
  digest: { content: DigestContent | Record<string, unknown> },
  memberEmail: string,
  memberName: string,
): Promise<{ success: boolean; error?: string }> {
  if (!hasResendKey()) return { success: false, error: "Email not configured" };

  const content = digest.content as DigestContent;
  const weekLabel = content.weekLabel ?? "This week";
  const snapshots = content.connectionSnapshot?.slice(0, 3) ?? [];
  const starters = content.conversationStarters?.slice(0, 2) ?? [];

  try {
    const resend = getResend();

    // Build connection health rows
    const snapshotRows = snapshots
      .map(
        (s) => `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f0e6d2;">
              <span style="font-size: 14px;">${s.emoji} <strong>${s.memberB.name}</strong></span>
            </td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f0e6d2; text-align: right;">
              <span style="color: ${s.score <= 30 ? "#dc2626" : s.score <= 50 ? "#d97706" : "#059669"}; font-weight: 600; font-size: 14px;">${s.label} — ${s.score}/100</span>
            </td>
          </tr>`,
      )
      .join("");

    // Build conversation starter rows
    const starterRows = starters
      .map(
        (s) => `
          <div style="background: #f0fdf4; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
            <p style="color: #166534; font-size: 14px; line-height: 1.5; margin: 0;">
              💬 ${s.text}
            </p>
          </div>`,
      )
      .join("");

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: memberEmail,
      subject: `📋 Your Family Digest — ${weekLabel}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
          <div style="font-size: 48px; text-align: center; margin-bottom: 16px;">🏠</div>
          <h1 style="color: #92400e; text-align: center; font-size: 24px; margin: 0 0 8px;">
            Your Family Digest
          </h1>
          <p style="color: #57534e; text-align: center; font-size: 16px; line-height: 1.6; margin: 0 0 4px;">
            ${weekLabel}
          </p>
          <p style="color: #a8a29e; text-align: center; font-size: 14px; margin: 0 0 24px;">
            A private summary for ${memberName || "you"}
          </p>

          ${snapshots.length > 0 ? `
          <div style="background: #fef3c7; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
            <h2 style="color: #92400e; font-size: 16px; margin: 0 0 12px;">💞 Connection Health</h2>
            <table style="width: 100%; border-collapse: collapse;">
              ${snapshotRows}
            </table>
          </div>
          ` : ""}

          ${starters.length > 0 ? `
          <div style="margin-bottom: 16px;">
            <h2 style="color: #92400e; font-size: 16px; margin: 0 0 8px;">💬 Conversation Starters</h2>
            ${starterRows}
          </div>
          ` : ""}

          ${content.irlNudge ? `
          <div style="background: #ecfdf5; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <h2 style="color: #065f46; font-size: 16px; margin: 0 0 8px;">📍 Make It Real</h2>
            <p style="color: #065f46; font-size: 14px; line-height: 1.5; margin: 0;">
              ${content.irlNudge.activitySuggestion}
            </p>
          </div>
          ` : ""}

          <a href="https://familyhub.ctonew.app/digest"
             style="display: block; background: #d97706; color: white; text-align: center;
                    padding: 14px 24px; border-radius: 12px; font-size: 16px; font-weight: 600;
                    text-decoration: none; margin-bottom: 24px;">
            View Full Digest →
          </a>
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
