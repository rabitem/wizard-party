import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APPEARANCE } from '@shared/domain/character';

vi.mock('server-only', () => ({}));

import type { SocialPlayer } from '@shared/domain/social';

import { createUnsubscribeToken, verifyUnsubscribeToken } from './email-unsubscribe';
import { friendRequestMail, gameInviteMail } from './social-email-templates';

const player = (overrides: Partial<SocialPlayer>): SocialPlayer => ({
  userId: 'u1', username: 'merlin', displayName: 'Merlin', avatar: 'wizard', appearance: DEFAULT_APPEARANCE, level: 12, hasPublicProfile: true, ...overrides,
});

describe('unsubscribe tokens', () => {
  beforeEach(() => vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret'));
  afterEach(() => vi.unstubAllEnvs());

  it('should round-trip the user and category', () => {
    const token = createUnsubscribeToken('user.with.dots', 'game_invites');
    expect(verifyUnsubscribeToken(token)).toEqual({ userId: 'user.with.dots', category: 'game_invites' });
    expect(verifyUnsubscribeToken(createUnsubscribeToken('u1', 'friend_requests'))).toEqual({ userId: 'u1', category: 'friend_requests' });
  });

  it('should reject tampered or foreign tokens', () => {
    const token = createUnsubscribeToken('u1', 'game_invites');
    const [category, , signature] = token.split('.');
    expect(verifyUnsubscribeToken(`${category}.${Buffer.from('u2').toString('base64url')}.${signature}`)).toBeNull();
    expect(verifyUnsubscribeToken('newsletter.dTE.abc')).toBeNull();
    expect(verifyUnsubscribeToken(42)).toBeNull();
    vi.stubEnv('BETTER_AUTH_SECRET', 'other-secret');
    expect(verifyUnsubscribeToken(token)).toBeNull();
  });
});

describe('gameInviteMail', () => {
  const input = {
    to: 'bob@example.com',
    inviter: player({ displayName: '<b>Evil</b>', username: 'evil' }),
    recipient: player({ userId: 'u2', displayName: 'Bob', username: 'bob' }),
    joinUrl: 'https://wizardparty.fun/lobby/abc123',
    unsubscribeUrl: 'https://wizardparty.fun/api/email/unsubscribe?token=t',
    cardContentId: 'invite-card',
    verified: true,
  };

  it('should escape player names and reference the inline avatar card', () => {
    const mail = gameInviteMail(input);
    expect(mail.html).not.toContain('<b>Evil</b>');
    expect(mail.html).toContain('cid:invite-card');
    expect(mail.html).toContain('https://wizardparty.fun/lobby/abc123');
  });

  it('should offer one-click unsubscribe', () => {
    const mail = gameInviteMail(input);
    expect(mail.headers).toEqual({ 'List-Unsubscribe': `<${input.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' });
    expect(mail.text).toContain(input.unsubscribeUrl);
  });

  it('should add the not-your-account note only for unverified addresses', () => {
    expect(gameInviteMail(input).text).not.toContain("Didn't create");
    expect(gameInviteMail({ ...input, verified: false }).text).toContain("Didn't create a Wizard Party account with this address?");
  });

  it('should still render without the card', () => {
    expect(gameInviteMail({ ...input, cardContentId: undefined }).html).not.toContain('cid:');
  });
});

describe('friendRequestMail', () => {
  it('should link to the inbox and unsubscribe from friend request emails only', () => {
    const mail = friendRequestMail({
      to: 'bob@example.com',
      requester: player({ displayName: 'Merlin', username: 'merlin' }),
      recipient: player({ userId: 'u2', displayName: 'Bob', username: 'bob' }),
      answerUrl: 'https://wizardparty.fun/?social=inbox',
      unsubscribeUrl: 'https://wizardparty.fun/api/email/unsubscribe?token=t',
      cardContentId: 'player-card',
      verified: false,
    });
    expect(mail.subject).toBe('Merlin wants to be your friend on Wizard Party');
    expect(mail.text).toContain("Didn't create a Wizard Party account with this address?");
    expect(mail.html).toContain('https://wizardparty.fun/?social=inbox');
    expect(mail.html).toContain('Unsubscribe from friend request emails');
    expect(mail.headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });
});
