/*
 * Shared HTML frame for transactional mail, styled like the site (parchment-on-ember, Georgia,
 * amber accents, crown mark). Email clients need tables, inline styles and bgcolor attributes:
 * Outlook ignores most CSS, Gmail strips <style> in some apps, and dark-mode clients recolour
 * anything that is not explicitly painted. Keep every visual decision inline.
 */

import { SITE_URL } from '@/config/deployment.config';

/** Closing line of every plain-text mail. */
export const TEXT_SIGNATURE = `— Wizard Party · ${SITE_URL}`;

export const EMAIL_COLORS = {
  page: '#0a0908',
  card: '#1a1510',
  cardEdge: '#3d3428',
  inset: '#0f0d0a',
  insetEdge: '#5c4a2e',
  gold: '#d4a853',
  goldBright: '#f0c674',
  goldDeep: '#8b6914',
  text: '#f2e8d5',
  textMuted: '#c9b998',
  textFaint: '#8b7355',
  buttonText: '#1a1208',
} as const;

const SERIF = "Georgia,'Times New Roman',Times,serif";
const MONO = "'SFMono-Regular',Menlo,Consolas,'Courier New',monospace";
const C = EMAIL_COLORS;

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

export function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-family:${SERIF};font-size:16px;line-height:1.6;color:${C.textMuted}">${escapeHtml(text)}</p>`;
}

export function smallPrint(text: string): string {
  return `<p style="margin:0;font-family:${SERIF};font-size:13px;line-height:1.55;color:${C.textFaint}">${escapeHtml(text)}</p>`;
}

/** Table-based button: renders as a solid gold block in every client, including Outlook desktop. */
export function button(label: string, url: string): string {
  const href = escapeHtml(url);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px">
<tr><td align="center" bgcolor="${C.gold}" style="border-radius:12px;background:${C.gold};background-image:linear-gradient(180deg,${C.goldBright} 0%,${C.gold} 55%,#b88a3a 100%)">
<a href="${href}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${SERIF};font-size:16px;font-weight:bold;color:${C.buttonText};text-decoration:none;border-radius:12px">${escapeHtml(label)}</a>
</td></tr></table>
<p style="margin:0 0 20px;font-family:${SERIF};font-size:12px;line-height:1.5;color:${C.textFaint};word-break:break-all">Button not working? Paste this link into your browser:<br><a href="${href}" style="color:${C.gold};text-decoration:underline">${href}</a></p>`;
}

/** Large one-time code in an inset panel; digits spaced for reading aloud, selectable as one word. */
export function codeBlock(code: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px">
<tr><td align="center" bgcolor="${C.inset}" style="background:${C.inset};border:1px solid ${C.insetEdge};border-radius:14px;padding:22px 12px">
<div style="font-family:${MONO};font-size:34px;line-height:1;font-weight:bold;letter-spacing:10px;color:${C.goldBright};padding-left:10px">${escapeHtml(code)}</div>
</td></tr></table>`;
}

interface LayoutInput {
  /** Short heading inside the card. */
  heading: string;
  /** Hidden preview text shown next to the subject in inbox lists. */
  preheader: string;
  /** Already-escaped HTML built from the helpers above. */
  body: string;
  /** Already-escaped footer line explaining why the mail was sent (notification mail). */
  reason?: string;
}

const ACCOUNT_ACTION_REASON = 'because of an action on your account.';

export function emailLayout({ heading, preheader, body, reason = ACCOUNT_ACTION_REASON }: LayoutInput): string {
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(heading)}</title>
<style>
  :root { color-scheme: dark; supported-color-schemes: dark; }
  body { margin:0 !important; padding:0 !important; }
  a { color:${C.gold}; }
  @media (max-width:600px) {
    .wp-outer { padding:16px 10px !important; }
    .wp-card { padding:28px 22px !important; }
    .wp-heading { font-size:24px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${escapeHtml(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page}">
<tr><td align="center" class="wp-outer" style="padding:40px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
    <tr><td align="center" style="padding:0 0 22px">
      <a href="${SITE_URL}" target="_blank" style="text-decoration:none">
        <img src="${SITE_URL}/favicon.png" width="56" height="56" alt="" style="display:block;width:56px;height:56px;border:0;border-radius:16px;margin:0 auto 12px">
        <span style="display:block;font-family:${SERIF};font-size:26px;line-height:1.2;color:${C.text}">Wizard Party</span>
        <span style="display:block;font-family:${SERIF};font-size:11px;letter-spacing:4px;text-transform:uppercase;color:${C.gold};padding-top:6px">Medieval Trick-Taking</span>
      </a>
    </td></tr>
    <tr><td bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.cardEdge};border-radius:18px;overflow:hidden">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td height="3" bgcolor="${C.goldDeep}" style="height:3px;line-height:3px;font-size:0;background:${C.goldDeep};background-image:linear-gradient(90deg,${C.card} 0%,${C.gold} 50%,${C.card} 100%)">&nbsp;</td></tr>
        <tr><td class="wp-card" style="padding:36px 36px 32px">
          <h1 class="wp-heading" style="margin:0 0 18px;font-family:${SERIF};font-size:27px;line-height:1.25;font-weight:normal;color:${C.text}">${escapeHtml(heading)}</h1>
          ${body}
        </td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:24px 12px 0">
      <p style="margin:0 0 8px;font-family:${SERIF};font-size:14px;color:${C.goldDeep}">&#10086;</p>
      <p style="margin:0;font-family:${SERIF};font-size:12px;line-height:1.6;color:${C.textFaint}">
        Sent by <a href="${SITE_URL}" style="color:${C.textFaint};text-decoration:underline">Wizard Party</a> ${reason}<br>
        <a href="${SITE_URL}/privacy" style="color:${C.textFaint};text-decoration:underline">Privacy</a> &middot; <a href="${SITE_URL}/imprint" style="color:${C.textFaint};text-decoration:underline">Imprint</a>
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}
