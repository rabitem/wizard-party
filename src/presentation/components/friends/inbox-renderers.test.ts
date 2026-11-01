import { describe, expect, it } from 'vitest';

import { INBOX_KINDS, type InboxItem } from '@shared/domain/social';

import { INBOX_RENDERERS, rendererFor } from './inbox-renderers';

function item<K extends InboxItem['kind']>(kind: K, payload: Extract<InboxItem, { kind: K }>['payload'], actor: InboxItem['actor'] = null): InboxItem {
  return {
    id: 'item-1',
    kind,
    actor,
    payload,
    createdAt: 0,
    readAt: null,
    resolvedAt: null,
    resolution: null,
    expiresAt: null,
  } as unknown as InboxItem;
}

describe('INBOX_RENDERERS', () => {
  it('should label exactly the actions a kind offers', () => {
    for (const kind of Object.keys(INBOX_KINDS) as (keyof typeof INBOX_KINDS)[]) {
      const renderer = INBOX_RENDERERS[kind];
      const { actions } = INBOX_KINDS[kind];
      expect(renderer.acceptLabel !== undefined, `${kind} accept label`).toBe(actions.includes('accept'));
      expect(renderer.declineLabel !== undefined, `${kind} decline label`).toBe(actions.includes('decline'));
    }
  });

  describe('tournaments', () => {
    it('should announce a ready table with its round', () => {
      const ready = item('tournament_table_ready', { tournamentId: 'springcup01', name: 'Spring Cup', matchId: 'springcup01-2-1', round: 2, roundLabel: 'Round 2' });
      const renderer = rendererFor(ready);
      expect(renderer.title(ready)).toBe('Your table in Spring Cup is ready');
      expect(renderer.detail?.(ready)).toBe('Round 2');
      expect(renderer.acceptLabel).toBe('Join table');
    });

    it('should congratulate the champion and list known awards', () => {
      const won = item('tournament_finished', { tournamentId: 'springcup01', name: 'Spring Cup', rank: 1, entrants: 12, awards: ['champion', 'oracle', 'retired-award'] });
      const renderer = rendererFor(won);
      expect(renderer.title(won)).toBe('You won Spring Cup!');
      expect(renderer.detail?.(won)).toBe('of 12 players · Champion, Oracle');
    });

    it('should tell other entrants their placement and hosts that it ended', () => {
      const placed = item('tournament_finished', { tournamentId: 'springcup01', name: 'Spring Cup', rank: 3, entrants: 8, awards: [] });
      expect(rendererFor(placed).title(placed)).toBe('You finished 3rd in Spring Cup');
      expect(rendererFor(placed).detail?.(placed)).toBe('of 8 players');
      const hosted = item('tournament_finished', { tournamentId: 'springcup01', name: 'Spring Cup', rank: null, entrants: 8, awards: [] });
      expect(rendererFor(hosted).title(hosted)).toBe('Spring Cup has finished');
      expect(rendererFor(hosted).detail?.(hosted)).toBe('8 players');
    });

    it('should name the inviter of a tournament invite', () => {
      const actor = { userId: 'u1', username: 'merlin', displayName: 'Merlin', avatar: null, level: 3 } as unknown as InboxItem['actor'];
      const invite = item('tournament_invite', { tournamentId: 'springcup01', name: 'Spring Cup', inviteCode: 'abcd2345' }, actor);
      expect(rendererFor(invite).title(invite)).toBe('Merlin invited you to the tournament Spring Cup');
      expect(rendererFor(invite).detail?.(invite)).toBe('Private tournament');
    });
  });
});
