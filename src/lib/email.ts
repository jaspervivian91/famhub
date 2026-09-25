/**
 * Email Service — transactional emails via Resend
 *
 * Resend wrapper for all Family Core transactional emails (waitlist
 * confirmations, password resets, nudges, weekly digests).
 *
 * ── Warm design system v4 (owner brief, 2026-07-31) ────────────────────────
 * Every template is a letter, not a notification: warm cream canvas, one
 * sandy-beige card, a serif heading, a forest-green button, and terracotta
 * used only as a tiny ink dot / rule. Colours mirror the tokens in
 * `src/styles/app.css` (`@theme`) — email clients cannot read CSS variables,
 * so the hex values are repeated here deliberately. Fraunces (the web
 * heading face) is not loadable in most mail clients, so headings fall back
 * to Georgia, which is warm, widely installed and needs no web font.
 *
 * No emoji anywhere: emoji are never used as UI in this product.
 */

import { Resend } from "resend";
import type { Nudge } from "~/lib/types";
import type { DigestContent } from "~/lib/digest-engine";

const FROM_ADDRESS = "Family Core <onboarding@resend.dev>";

/** Public app URL used for every call to action in an email. */
const APP_URL = "https://familycore.ctonew.app";

/* ── Warm palette — mirrors src/styles/app.css @theme ──────────────────── */
const WARM = {
  bg: "#F5F0EB" /* warm cream canvas */,
  surface: "#E8D5C0" /* sandy beige — the letter card */,
  surfaceSoft: "#F0E4D3" /* nested surface inside a card */,
  ink: "#1A1A1A" /* soft charcoal body text */,
  accent: "#3A6B4A" /* forest green — CTAs, headings */,
  highlight: "#D4845A" /* terracotta — decorative only */,
  line: "#D8C6AF" /* hand-drawn divider ink */,
  border: "#C2A98C" /* card borders */,
  muted: "#6E5D4D" /* secondary text */,
  statusWarn: "#A6633F" /* quiet status: needs attention */,
  statusError: "#A63D2F" /* quiet status: dormant */,
} as const;

/** Serif that ships with every mail client — Fraunces will not load. */
const SERIF = "Georgia, 'Times New Roman', Times, serif";
/** Warm, humanist sans fallbacks (Atkinson Hyperlegible is web-only). */
const SANS = "'Trebuchet MS', 'Segoe UI', Helvetica, Arial, sans-serif";

const TAGLINE =
  "Family Core — stay close to the people who matter, without social media.";

/** Escape interpolated copy so member names and message text can't inject markup. */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** The one terracotta element: a small ink dot, like a mark made by hand. */
const INK_DOT = `<span style="display:inline-block; width:8px; height:8px; background:${WARM.highlight}; border-radius:50%; font-size:0; line-height:0;">&nbsp;</span>`;

/** Forest-green button — white text for contrast in every mail client. */
function warmButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 4px;">
      <tr>
        <td align="center" bgcolor="${WARM.accent}" style="border-radius:14px;">
          <a href="${esc(href)}" style="display:inline-block; padding:14px 28px; font-family:${SANS}; font-size:16px; font-weight:bold; line-height:1.2; color:#FFFFFF; text-decoration:none; border-radius:14px;">${esc(label)}</a>
        </td>
      </tr>
    </table>`;
}

/** A little note card inside the letter (cream on sand). */
function warmNote(
  innerHtml: string,
  options: { accentEdge?: boolean } = {},
): string {
  const edge = options.accentEdge
    ? ` border-left:4px solid ${WARM.accent};`
    : "";
  return `<div style="background:${WARM.bg}; border:1px solid ${WARM.border};${edge} border-radius:16px; padding:16px 18px; margin:0 0 16px;">
      ${innerHtml}
    </div>`;
}

function warmPara(innerHtml: string, extra = ""): string {
  return `<p style="margin:0 0 16px; font-family:${SANS}; font-size:16px; line-height:1.65; color:${WARM.ink}; ${extra}">${innerHtml}</p>`;
}

function warmSectionHeading(label: string): string {
  return `<h2 style="margin:0 0 10px; font-family:${SERIF}; font-size:17px; font-weight:normal; line-height:1.4; color:${WARM.ink};">${esc(label)}</h2>`;
}

interface WarmLetter {
  /** Hidden line shown as the inbox preview, next to the subject. */
  preheader: string;
  heading: string;
  /** HTML body — already escaped where needed. */
  content: string;
  /** Optional quiet note above the tagline. */
  footerNote?: string;
}

/** The shared warm canvas + sandy card + serif masthead every email wears. */
function warmLetter({
  preheader,
  heading,
  content,
  footerNote,
}: WarmLetter): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${esc(heading)}</title>
  </head>
  <body style="margin:0; padding:0; background:${WARM.bg};">
    <div style="display:none; font-size:1px; color:${WARM.bg}; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">${esc(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${WARM.bg};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:520px; background:${WARM.surface}; border:1px solid ${WARM.border}; border-radius:20px;">
            <tr>
              <td style="padding:28px 28px 0 28px;">
                ${INK_DOT}<span style="font-family:${SERIF}; font-size:19px; color:${WARM.ink};">&nbsp;Family <span style="color:${WARM.accent};">Core</span></span>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 0 28px;">
                <h1 style="margin:0; font-family:${SERIF}; font-size:25px; font-weight:normal; line-height:1.35; color:${WARM.ink};">${esc(heading)}</h1>
                <div style="width:44px; height:3px; background:${WARM.highlight}; border-radius:2px; margin:14px 0 0;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 0 28px;">
                ${content}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 28px 28px;">
                <div style="border-top:1px solid ${WARM.line}; padding-top:16px;">
                  ${
                    footerNote
                      ? `<p style="margin:0 0 10px; font-family:${SANS}; font-size:13px; line-height:1.6; color:${WARM.muted};">${esc(footerNote)}</p>`
                      : ""
                  }
                  <p style="margin:0; font-family:${SANS}; font-size:13px; line-height:1.6; color:${WARM.muted};">${esc(TAGLINE)}</p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Quiet, warm status colour for a connection score. */
function scoreColor(score: number): string {
  if (score <= 30) return WARM.statusError;
  if (score <= 50) return WARM.statusWarn;
  return WARM.accent;
}

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set — email sending is disabled.");
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

  const content = `
    ${warmPara("Thanks for joining the Family Core waitlist. We'll let you know the moment we launch — and as an early member, you'll get premium features free for the first year.")}
    ${warmNote(
      `<p style="margin:0; font-family:${SANS}; font-size:15px; line-height:1.6; color:${WARM.ink};">
        <strong style="color:${WARM.accent};">Stay tuned</strong><br />
        In the meantime, tell your family about Family Core. The more people waiting, the better the launch.
      </p>`,
    )}`;

  const text = [
    "You're on the list",
    "",
    "Thanks for joining the Family Core waitlist. We'll let you know the moment we launch — and as an early member, you'll get premium features free for the first year.",
    "",
    "Stay tuned — in the meantime, tell your family about Family Core. The more people waiting, the better the launch.",
    "",
    TAGLINE,
  ].join("\n");

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: "You're on the Family Core waitlist!",
      html: warmLetter({
        preheader:
          "You're on the list — we'll write the moment Family Core opens.",
        heading: "You're on the list",
        content,
      }),
      text,
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

  const content = `
    ${warmPara("Choose a new password for your Family Core account with the button below. This link is good for one hour.")}
    ${warmButton("Choose a new password", resetLink)}`;

  const text = [
    "Reset your password",
    "",
    "Open this link to choose a new Family Core password. It expires in one hour:",
    resetLink,
    "",
    "If you didn't request this, you can safely ignore this email.",
    "",
    TAGLINE,
  ].join("\n");

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: "Reset your Family Core password",
      html: warmLetter({
        preheader: "A one-hour link to choose a new password.",
        heading: "Reset your password",
        content,
        footerNote:
          "If you didn't ask for this, you can safely ignore this email.",
      }),
      text,
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

  const label = NUDGE_LABEL[nudge.nudge_type] ?? "A little nudge";
  const greeting = memberName || "there";

  const content = `
    ${warmPara(`Hi ${esc(greeting)} — here's a little nudge from your family.`)}
    ${warmNote(
      `<p style="margin:0; font-family:${SANS}; font-size:16px; line-height:1.6; color:${WARM.ink};">${esc(nudge.message_text)}</p>`,
    )}
    ${warmButton("Open your dashboard", `${APP_URL}/dashboard`)}`;

  const text = [
    label,
    "",
    `Hi ${greeting} — here's a little nudge from your family.`,
    "",
    nudge.message_text,
    "",
    `Open your dashboard: ${APP_URL}/dashboard`,
    "",
    TAGLINE,
  ].join("\n");

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: memberEmail,
      subject: `${label} — from Family Core`,
      html: warmLetter({
        preheader: `${label} — a quiet nudge from your family.`,
        heading: label,
        content,
      }),
      text,
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
                <td style="padding:9px 0; border-bottom:1px solid ${WARM.line}; font-family:${SANS}; font-size:15px; color:${WARM.ink};">
                  <strong>${esc(s.memberB.name)}</strong>
                </td>
                <td style="padding:9px 0; border-bottom:1px solid ${WARM.line}; text-align:right; font-family:${SANS}; font-size:15px; font-weight:bold; color:${scoreColor(s.score)};">
                  ${esc(s.label)} — ${s.score}/100
                </td>
              </tr>`,
      )
      .join("");

    // Build conversation starter cards
    const starterRows = starters
      .map(
        (s) => `
            ${warmNote(
              `<p style="margin:0; font-family:${SANS}; font-size:15px; line-height:1.6; color:${WARM.ink};">${INK_DOT}&nbsp; ${esc(s.text)}</p>`,
            )}`,
      )
      .join("");

    const memberLine = memberName || "you";

    const body = `
      ${warmPara(esc(weekLabel), `text-align:center; font-size:17px; margin-bottom:4px;`)}
      ${warmPara(`A private summary for ${esc(memberLine)}`, `text-align:center; font-size:14px; color:${WARM.muted}; margin-bottom:22px;`)}

      ${
        snapshots.length > 0
          ? `
      <div style="margin:0 0 20px;">
        ${warmSectionHeading("Connection health")}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; width:100%;">
          ${snapshotRows}
        </table>
      </div>
      `
          : ""
      }

      ${
        starters.length > 0
          ? `
      <div style="margin:0 0 20px;">
        ${warmSectionHeading("Conversation starters")}
        ${starterRows}
      </div>
      `
          : ""
      }

      ${
        content.irlNudge
          ? `
      <div style="margin:0 0 20px;">
        ${warmSectionHeading("Make it real")}
        ${warmNote(
          `<p style="margin:0; font-family:${SANS}; font-size:15px; line-height:1.6; color:${WARM.ink};">${esc(content.irlNudge.activitySuggestion)}</p>`,
          { accentEdge: true },
        )}
      </div>
      `
          : ""
      }

      ${warmButton("Read your digest", `${APP_URL}/digest`)}`;

    const textSections = [
      "Your Family Digest",
      weekLabel,
      `A private summary for ${memberLine}`,
      "",
    ];
    if (snapshots.length > 0) {
      textSections.push("Connection health");
      for (const s of snapshots) {
        textSections.push(`  ${s.memberB.name} — ${s.label} (${s.score}/100)`);
      }
      textSections.push("");
    }
    if (starters.length > 0) {
      textSections.push("Conversation starters");
      for (const s of starters) {
        textSections.push(`  ${s.text}`);
      }
      textSections.push("");
    }
    if (content.irlNudge) {
      textSections.push("Make it real");
      textSections.push(`  ${content.irlNudge.activitySuggestion}`);
      textSections.push("");
    }
    textSections.push(`Read your digest: ${APP_URL}/digest`, "", TAGLINE);

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: memberEmail,
      subject: `Your Family Digest — ${weekLabel}`,
      html: warmLetter({
        preheader: `Your week in family — ${weekLabel}.`,
        heading: "Your Family Digest",
        content: body,
      }),
      text: textSections.join("\n"),
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
