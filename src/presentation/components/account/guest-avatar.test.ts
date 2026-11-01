import { describe, expect, it } from 'vitest';

import { guestAvatarId } from './guest-avatar';

const IDS = ['wizard', 'knight', 'crown', 'dragon', 'sword', 'shield'] as const;

describe('guestAvatarId', () => {
  it('should give the same browser the same avatar on every call', () => {
    expect(guestAvatarId('player-1700000000000-abc1234', IDS)).toBe(guestAvatarId('player-1700000000000-abc1234', IDS));
  });

  it('should spread different browsers over the catalog', () => {
    const picked = new Set(Array.from({ length: 60 }, (_, index) => guestAvatarId(`player-1700000000${index}-x`, IDS)));
    expect(picked.size).toBeGreaterThan(IDS.length / 2);
  });

  it('should pick from the catalog for an empty id (server render, blocked storage)', () => {
    expect(IDS).toContain(guestAvatarId('', IDS));
  });
});
