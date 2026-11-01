import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const unsubscribe = vi.hoisted(() => vi.fn(async (_userId: string, _category: string) => {}));

vi.mock('server-only', () => ({}));
vi.mock('@/infrastructure/db/neon', () => ({ isDatabaseConfigured: () => true }));
vi.mock('@/infrastructure/social/social-container', () => ({
  getSocialServices: () => ({ unsubscribeFromEmails: { execute: unsubscribe } }),
}));

import { createUnsubscribeToken } from '@/infrastructure/email/email-unsubscribe';

import { GET, POST } from './route';

const ORIGIN = 'https://wizardparty.fun';
/** RFC 8058 body a mailbox provider posts for one-click unsubscribe. */
const ONE_CLICK = 'List-Unsubscribe=One-Click';

const linkFor = (token: string) => `${ORIGIN}/api/email/unsubscribe?${new URLSearchParams({ token })}`;
const post = (token: string, body?: string) => POST(new Request(linkFor(token), { method: 'POST', body }));

describe('/api/email/unsubscribe', () => {
  beforeEach(() => {
    vi.stubEnv('EMAIL_UNSUBSCRIBE_SECRET', 'unsubscribe-secret-for-tests');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    unsubscribe.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('should only lead a GET (mail scanners, previews) to the confirmation page, changing nothing', async () => {
    const token = createUnsubscribeToken('user-ada', 'game_invites');
    const response = await GET(new Request(linkFor(token)));
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(`${ORIGIN}/unsubscribe?${new URLSearchParams({ token })}`);
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it('should turn the category off on a confirmed POST and show the result', async () => {
    const response = await post(createUnsubscribeToken('user-ada', 'game_invites'));
    expect(unsubscribe).toHaveBeenCalledWith('user-ada', 'game_invites');
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(`${ORIGIN}/unsubscribe?status=done&category=game_invites`);
  });

  it('should answer a one-click unsubscribe with a plain 200', async () => {
    const response = await post(createUnsubscribeToken('user-ada', 'friend_requests'), ONE_CLICK);
    expect(response.status).toBe(200);
    expect(unsubscribe).toHaveBeenCalledWith('user-ada', 'friend_requests');
  });

  it('should change nothing for a link whose user was swapped', async () => {
    const [category, , signature] = createUnsubscribeToken('user-ada', 'game_invites').split('.');
    const forged = `${category}.${Buffer.from('user-eve').toString('base64url')}.${signature}`;

    const confirmed = await post(forged);
    expect(confirmed.headers.get('location')).toBe(`${ORIGIN}/unsubscribe?status=invalid`);
    // Mailbox providers expect a 2xx whatever happens.
    expect((await post(forged, ONE_CLICK)).status).toBe(202);
    expect(unsubscribe).not.toHaveBeenCalled();
  });
});
