import 'server-only';

import type { EmailMessage, IEmailSender } from '@shared/application/ports/email-sender.port';
import type { FriendRequestEmail, GameInviteEmail, ISocialMailer } from '@shared/application/ports/social';
import type { EmailCategory, SocialPlayer } from '@shared/domain/social';

import { createUnsubscribeToken } from '../email/email-unsubscribe';
import { renderPlayerPairCard, type PairSymbol } from '../email/player-pair-card';
import { friendRequestMail, gameInviteMail } from '../email/social-email-templates';

const CARD_CONTENT_ID = 'player-card';

/** Renders social mails with their avatar card and one-click unsubscribe, then sends them. */
export class EmailSocialMailer implements ISocialMailer {
  constructor(
    private readonly sender: IEmailSender,
    private readonly siteUrl: string
  ) {}

  async gameInvite({ to, inviter, recipient, roomCode, verified }: GameInviteEmail): Promise<void> {
    await this.deliver(inviter, recipient, 'duel', 'game_invites', (shared) =>
      gameInviteMail({ ...shared, to, inviter, recipient, verified, joinUrl: `${this.siteUrl}/lobby/${encodeURIComponent(roomCode)}` })
    );
  }

  async friendRequest({ to, requester, recipient, verified }: FriendRequestEmail): Promise<void> {
    await this.deliver(requester, recipient, 'friendship', 'friend_requests', (shared) =>
      friendRequestMail({ ...shared, to, requester, recipient, verified, answerUrl: `${this.siteUrl}/?social=inbox` })
    );
  }

  private async deliver(
    sender: SocialPlayer,
    recipient: SocialPlayer,
    symbol: PairSymbol,
    category: EmailCategory,
    build: (shared: { unsubscribeUrl: string; cardContentId?: string }) => EmailMessage
  ): Promise<void> {
    if (!this.sender.canDeliver) return;
    // The card is decoration: a rendering failure still sends the mail, just without it.
    const card = await renderPlayerPairCard(sender, recipient, symbol).catch((error: unknown) => {
      console.warn('[social-mail] avatar card failed', error instanceof Error ? error.message : error);
      return null;
    });
    const token = createUnsubscribeToken(recipient.userId, category);
    const message = build({
      unsubscribeUrl: `${this.siteUrl}/api/email/unsubscribe?token=${encodeURIComponent(token)}`,
      cardContentId: card ? CARD_CONTENT_ID : undefined,
    });
    await this.sender.send({
      ...message,
      attachments: card ? [{ filename: 'players.png', contentType: 'image/png', content: card.toString('base64'), contentId: CARD_CONTENT_ID }] : undefined,
    });
  }
}
