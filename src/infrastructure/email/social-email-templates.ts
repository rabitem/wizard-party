import type { EmailMessage } from '@shared/application/ports/email-sender.port';
import type { SocialPlayer } from '@shared/domain/social';

import { EMAIL_COLORS as C, TEXT_SIGNATURE, button, emailLayout, escapeHtml, paragraph, smallPrint } from './email-layout';

const SERIF = "Georgia,'Times New Roman',Times,serif";

/** What every social notification mail has: two players, a card of their avatars, opt-out. */
interface PlayerPairMailBase {
  to: string;
  recipient: SocialPlayer;
  unsubscribeUrl: string;
  /** False for unverified addresses: the mail then says what to do if the account isn't theirs. */
  verified: boolean;
  /** cid of the inline avatar card attachment; omitted when the card could not be rendered. */
  cardContentId?: string;
}

export interface GameInviteMailInput extends PlayerPairMailBase {
  inviter: SocialPlayer;
  joinUrl: string;
}

export interface FriendRequestMailInput extends PlayerPairMailBase {
  requester: SocialPlayer;
  /** Opens the social panel's inbox, where the request can be answered. */
  answerUrl: string;
}

/** Added to mails sent to an unverified address, which may belong to someone else. */
const NOT_YOUR_ACCOUNT = "Didn't create a Wizard Party account with this address? Just ignore this email, or unsubscribe below and you won't hear from us again.";

const footnoteFor = (verified: boolean, note: string) => (verified ? note : `${note} ${NOT_YOUR_ACCOUNT}`);

/** Names under the avatar card, aligned with the two medallions. */
function nameplates(left: SocialPlayer, right: SocialPlayer): string {
  const cell = (player: SocialPlayer) =>
    `<td width="50%" align="center" style="padding:10px 6px 0;font-family:${SERIF}"><span style="display:block;font-size:17px;color:${C.text}">${escapeHtml(player.displayName)}</span></td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cell(left)}${cell(right)}</tr></table>`;
}

function avatarCard(left: SocialPlayer, right: SocialPlayer, alt: string, contentId?: string): string {
  if (!contentId) return '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 24px">
<tr><td align="center" bgcolor="${C.inset}" style="background:${C.inset};border:1px solid ${C.insetEdge};border-radius:16px;padding:12px">
<img src="cid:${escapeHtml(contentId)}" width="460" alt="${escapeHtml(alt)}" style="display:block;width:100%;max-width:460px;height:auto;border:0;border-radius:12px">
${nameplates(left, right)}
</td></tr></table>`;
}

interface PlayerPairMail {
  base: PlayerPairMailBase;
  sender: SocialPlayer;
  subject: string;
  heading: string;
  intro: string;
  cta: { label: string; url: string };
  footnote: string;
  /** e.g. "game invite emails"; used in the opt-out lines. */
  category: string;
  /** Why the mail was sent, completing "You receive this ...". */
  reason: string;
}

/** The shared layout of social notification mails, with one-click unsubscribe (RFC 8058). */
function playerPairMail({ base, sender, subject, heading, intro, cta, footnote, category, reason }: PlayerPairMail): EmailMessage {
  const optOut = `Don't want these emails? Unsubscribe from ${category}: ${base.unsubscribeUrl}`;
  const unsubscribeLink = `<a href="${escapeHtml(base.unsubscribeUrl)}" style="color:${C.textFaint};text-decoration:underline">Unsubscribe from ${escapeHtml(category)}</a>`;
  return {
    to: base.to,
    subject,
    text: `${intro}\n\n${cta.label}: ${cta.url}\n\n${footnote}\n\nYou receive this ${reason}\n${optOut}\nYou can also change this under Account → Profile → Communication.\n\n${TEXT_SIGNATURE}`,
    html: emailLayout({
      heading,
      preheader: intro,
      body: avatarCard(sender, base.recipient, subject, base.cardContentId) + paragraph(intro) + button(cta.label, cta.url) + smallPrint(footnote),
      reason: `${escapeHtml(reason)} ${unsubscribeLink}.`,
    }),
    headers: {
      'List-Unsubscribe': `<${base.unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
}

/** "X invited you to a game", sent when the recipient is offline. */
export function gameInviteMail(input: GameInviteMailInput): EmailMessage {
  const { inviter } = input;
  return playerPairMail({
    base: input,
    sender: inviter,
    subject: `${inviter.displayName} invited you to a game of Wizard Party`,
    heading: 'You are invited to the table!',
    intro: `${inviter.displayName} has a seat waiting for you at their table. Join now while the lobby is open.`,
    cta: { label: 'Join the game', url: input.joinUrl },
    footnote: footnoteFor(input.verified, 'Invites expire after a few minutes, and the table may already be full.'),
    category: 'game invite emails',
    reason: 'because a friend invited you while you were offline.',
  });
}

/** "X wants to be your friend", sent when the recipient is offline. */
export function friendRequestMail(input: FriendRequestMailInput): EmailMessage {
  const { requester } = input;
  return playerPairMail({
    base: input,
    sender: requester,
    subject: `${requester.displayName} wants to be your friend on Wizard Party`,
    heading: 'A new friend request!',
    intro: `${requester.displayName} sent you a friend request. Friends see when you're online, can invite you to their table and join yours.`,
    cta: { label: 'Answer the request', url: input.answerUrl },
    footnote: footnoteFor(input.verified, "Not interested? Just decline. They won't be told, and you can block players in the same place."),
    category: 'friend request emails',
    reason: 'because a player sent you a friend request while you were offline.',
  });
}
