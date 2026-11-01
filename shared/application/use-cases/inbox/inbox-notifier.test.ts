import { describe, expect, it } from 'vitest';

import { SOCIAL_LIMITS } from '../../../domain/social';
import { MemorySocial } from '../friends/social-test-fakes';
import { InboxNotifier } from './inbox-notifier';

const NOW = 1_700_000_000_000;
const TOURNAMENT_ID = 'abcdefghjkmn';

function setup() {
  const db = new MemorySocial();
  const notifier = new InboxNotifier(db, { now: () => NOW });
  return { db, notifier };
}

describe('InboxNotifier', () => {
  describe('deliver', () => {
    it('should key tournament kinds on the payload so a new round replaces the previous table', async () => {
      const { db, notifier } = setup();
      const ready = (round: number) =>
        notifier.deliver({
          userId: 'u1',
          kind: 'tournament_table_ready',
          actorId: null,
          payload: { tournamentId: TOURNAMENT_ID, name: 'Cup', matchId: `${TOURNAMENT_ID}-${round}-1`, round, roundLabel: `Round ${round}` },
        });
      await ready(1);
      await ready(2);

      const tables = db.items.filter((item) => item.userId === 'u1' && item.kind === 'tournament_table_ready');
      expect(tables).toHaveLength(1);
      expect(tables[0].payload).toMatchObject({ round: 2 });
    });

    it('should apply the kind expiry', async () => {
      const { db, notifier } = setup();
      await notifier.deliver({ userId: 'u1', kind: 'friend_accepted', actorId: 'u2', payload: {} });
      await notifier.deliver({ userId: 'u1', kind: 'game_invite', actorId: 'u3', payload: { roomCode: 'ABCD' } });

      expect(db.items.find((item) => item.kind === 'friend_accepted')).toMatchObject({ createdAt: NOW, expiresAt: null });
      expect(db.items.find((item) => item.kind === 'game_invite')).toMatchObject({
        createdAt: NOW,
        expiresAt: NOW + SOCIAL_LIMITS.GAME_INVITE_TTL_MS,
      });
    });
  });

  describe('withdraw', () => {
    it('should find payload keyed items through the payload and skip them without one', async () => {
      const { db, notifier } = setup();
      await notifier.deliver({
        userId: 'u1',
        kind: 'tournament_invite',
        actorId: 'u2',
        payload: { tournamentId: TOURNAMENT_ID, name: 'Cup', inviteCode: null },
      });
      const invite = () => db.items.find((item) => item.userId === 'u1' && item.kind === 'tournament_invite');

      await notifier.withdraw('u1', 'tournament_invite', 'u2', 'cancelled');
      expect(invite()).toMatchObject({ resolvedAt: null, resolution: null });

      await notifier.withdraw('u1', 'tournament_invite', 'u2', 'cancelled', { tournamentId: TOURNAMENT_ID });
      expect(invite()).toMatchObject({ resolvedAt: NOW, resolution: 'cancelled' });
    });
  });
});
