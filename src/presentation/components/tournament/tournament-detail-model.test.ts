import { describe, expect, it } from 'vitest';

import type { TournamentDetailView, TournamentViewerView } from '@shared/application/use-cases/tournament';
import type { Standing } from '@shared/domain/tournament';

import {
  advanceCaption,
  confettiPieces,
  inviteButtonLabel,
  inviteCandidates,
  inviteSummary,
  matchStatusPresentation,
  podiumOrder,
  podiumStep,
  reachedLabel,
  managesTables,
  resolveBlockedReason,
  shouldAutoJoin,
  startBlocker,
  toggleInvite,
  viewerProgressLine,
  type PodiumEntry,
} from './tournament-detail-model';

const MINUTE = 60_000;

function viewer(overrides: Partial<TournamentViewerView> = {}): TournamentViewerView {
  return {
    userId: 'me',
    isHost: false,
    isEntrant: false,
    entrantStatus: null,
    canRegister: false,
    registrationBlocker: null,
    canWithdraw: false,
    canEdit: false,
    canStart: false,
    canCancel: false,
    canInvite: false,
    myMatch: null,
    resolvableMatchIds: [],
    ...overrides,
  };
}

function standing(rank: number, userId: string): Standing {
  return {
    rank,
    userId,
    username: userId,
    displayName: userId,
    seed: rank,
    status: 'active',
    points: 0,
    tableWins: 0,
    totalScore: 0,
    bidAccuracy: null,
    matchesPlayed: 1,
    roundsPlayed: 1,
    reachedRound: 1,
    noShows: 0,
  };
}

const MY_MATCH = { matchId: 'm1', round: 1, table: 1, label: 'Cup · Round 1 · Table 1', roomCode: 't-abcdefghjkmnpq', deadlineAt: 0 };

describe('tournament detail model', () => {
  describe('matchStatusPresentation', () => {
    const pending = { status: 'pending' as const, staleAt: 75 * MINUTE, resolvableAt: 75 * MINUTE, deadlineAt: 180 * MINUTE, live: null };
    /** The worker reported round 3 of 10 at minute 70: the host may resolve it from minute 80 on. */
    const playing = { ...pending, resolvableAt: 80 * MINUTE, live: { round: 3, maxRounds: 10, lastActivityAt: 70 * MINUTE } };

    it('should show a running table with its deadline', () => {
      const status = matchStatusPresentation(pending, 10 * MINUTE);
      expect(status).toMatchObject({ label: 'Playing', tone: 'live' });
      expect(status.detail).toMatch(/voided in 2h 50m/i);
    });

    it('should flag a stale table as overdue for the host', () => {
      const status = matchStatusPresentation(pending, 80 * MINUTE);
      expect(status).toMatchObject({ label: 'Overdue', tone: 'overdue' });
      expect(status.detail).toMatch(/host may resolve/i);
    });

    it('should explain a table past its deadline', () => {
      expect(matchStatusPresentation(pending, 200 * MINUTE).detail).toMatch(/past its deadline/i);
    });

    it('should show how far a table in play got', () => {
      expect(matchStatusPresentation(playing, 72 * MINUTE)).toMatchObject({ label: 'Playing · round 3 of 10', tone: 'live' });
    });

    it('should keep an overdue table that is still being played from looking resolvable', () => {
      const status = matchStatusPresentation(playing, 78 * MINUTE);
      expect(status).toMatchObject({ label: 'Playing · round 3 of 10', tone: 'live' });
      expect(status.detail).not.toMatch(/host may resolve/i);
    });

    it('should flag a table that went quiet, naming the last round it reported', () => {
      const status = matchStatusPresentation(playing, 80 * MINUTE);
      expect(status).toMatchObject({ label: 'Overdue', tone: 'overdue' });
      expect(status.detail).toMatch(/no news since round 3 of 10\. The host may resolve it now/i);
    });

    it('should label decided tables', () => {
      expect(matchStatusPresentation({ ...pending, status: 'completed' }, 0)).toEqual({ label: 'Played', tone: 'done', detail: null });
      expect(matchStatusPresentation({ ...pending, status: 'void' }, 0)).toMatchObject({ label: 'Void', tone: 'void' });
    });
  });

  describe('resolveBlockedReason', () => {
    const pending = { status: 'pending' as const, staleAt: 75 * MINUTE, resolvableAt: 80 * MINUTE, deadlineAt: 180 * MINUTE, live: { round: 3, maxRounds: 10, lastActivityAt: 70 * MINUTE } };

    it('should explain that an overdue table in play can not be resolved yet, and until when', () => {
      const reason = resolveBlockedReason(pending, 78 * MINUTE);
      expect(reason).toMatch(/still being played \(round 3 of 10\)/i);
      expect(reason).toMatch(/resolve it in 2:00/);
    });

    it('should say nothing before the table is overdue, once it may be resolved, or once decided', () => {
      expect(resolveBlockedReason(pending, 70 * MINUTE)).toBeNull();
      expect(resolveBlockedReason(pending, 80 * MINUTE)).toBeNull();
      expect(resolveBlockedReason({ ...pending, status: 'completed' }, 78 * MINUTE)).toBeNull();
    });
  });

  describe('managesTables', () => {
    it('should let only the host of a running tournament see why tables cannot be resolved yet', () => {
      expect(managesTables({ viewer: viewer({ isHost: true }), tournament: { status: 'running' } })).toBe(true);
      expect(managesTables({ viewer: viewer({ isHost: true }), tournament: { status: 'cancelled' } })).toBe(false);
      expect(managesTables({ viewer: viewer({ isHost: true }), tournament: { status: 'completed' } })).toBe(false);
      expect(managesTables({ viewer: viewer(), tournament: { status: 'running' } })).toBe(false);
    });
  });

  it('should caption knockout tables', () => {
    expect(advanceCaption(1)).toBe('Winner advances');
    expect(advanceCaption(3)).toBe('Top 3 advance');
  });

  it('should name the round a player reached', () => {
    const rounds = [{ round: 1, label: 'Round 1' }, { round: 2, label: 'Final' }];
    expect(reachedLabel(2, rounds)).toBe('Final');
    expect(reachedLabel(3, rounds)).toBe('Round 3');
    expect(reachedLabel(0, rounds)).toBe('—');
  });

  describe('viewerProgressLine', () => {
    const base = { standings: [] as Standing[], entrants: [] as TournamentDetailView['entrants'] };

    it('should say nothing to spectators', () => {
      expect(viewerProgressLine({ ...base, viewer: viewer(), tournament: { status: 'running', startsAt: null } })).toBeNull();
    });

    it('should confirm a registration, mentioning a scheduled start', () => {
      expect(viewerProgressLine({ ...base, viewer: viewer({ isEntrant: true }), tournament: { status: 'registration', startsAt: null } })).toMatch(/notification/);
      expect(viewerProgressLine({ ...base, viewer: viewer({ isEntrant: true }), tournament: { status: 'registration', startsAt: 1 } })).toMatch(/when the tournament starts/);
    });

    it('should stay quiet while the viewer has a table and explain waiting or elimination otherwise', () => {
      const running = { status: 'running' as const, startsAt: null };
      expect(viewerProgressLine({ ...base, viewer: viewer({ isEntrant: true, entrantStatus: 'active', myMatch: MY_MATCH }), tournament: running })).toBeNull();
      expect(viewerProgressLine({ ...base, viewer: viewer({ isEntrant: true, entrantStatus: 'active' }), tournament: running })).toMatch(/next round/);
      expect(viewerProgressLine({ ...base, viewer: viewer({ isEntrant: true, entrantStatus: 'eliminated' }), tournament: running })).toMatch(/knocked out/);
    });

    it('should report the final placement', () => {
      const standings = [standing(1, 'a'), standing(2, 'me'), standing(3, 'b')];
      expect(viewerProgressLine({ ...base, standings, viewer: viewer({ isEntrant: true }), tournament: { status: 'completed', startsAt: null } })).toBe('You finished 2nd of 3.');
    });
  });

  describe('startBlocker', () => {
    const entrants = [{ userId: 'a' }, { userId: 'b' }] as TournamentDetailView['entrants'];

    it('should tell the host how many players are missing', () => {
      const detail = { viewer: viewer({ isHost: true }), entrants, tournament: { status: 'registration' as const, minimumEntrants: 3 } };
      expect(startBlocker(detail)).toBe('At least 3 players are needed to start (1 more).');
    });

    it('should be silent for guests, startable tournaments and after the start', () => {
      expect(startBlocker({ viewer: viewer(), entrants, tournament: { status: 'registration', minimumEntrants: 3 } })).toBeNull();
      expect(startBlocker({ viewer: viewer({ isHost: true, canStart: true }), entrants, tournament: { status: 'registration', minimumEntrants: 2 } })).toBeNull();
      expect(startBlocker({ viewer: viewer({ isHost: true }), entrants, tournament: { status: 'running', minimumEntrants: 3 } })).toBeNull();
    });
  });

  it('should auto-join once, and only with a pending table', () => {
    expect(shouldAutoJoin(true, MY_MATCH, false)).toBe(true);
    expect(shouldAutoJoin(true, MY_MATCH, true)).toBe(false);
    expect(shouldAutoJoin(true, null, false)).toBe(false);
    expect(shouldAutoJoin(false, MY_MATCH, false)).toBe(false);
  });

  describe('invites', () => {
    const friend = (userId: string, displayName: string, status: string) => ({ userId, displayName, presence: { status } });

    it('should skip registered friends and list online ones first, then by name', () => {
      const friends = [friend('1', 'Zed', 'online'), friend('2', 'Amy', 'offline'), friend('3', 'Bob', 'away'), friend('4', 'Cat', 'online')];
      expect(inviteCandidates(friends, new Set(['4'])).map((item) => item.displayName)).toEqual(['Bob', 'Zed', 'Amy']);
    });

    it('should toggle selections up to the per-request limit', () => {
      let selected = toggleInvite(new Set(), 'a', 2);
      selected = toggleInvite(selected, 'b', 2);
      expect(toggleInvite(selected, 'c', 2)).toEqual(new Set(['a', 'b']));
      expect(toggleInvite(selected, 'a', 2)).toEqual(new Set(['b']));
      expect(toggleInvite(new Set(), 'x').size).toBe(1);
    });

    it('should label the send button', () => {
      expect([0, 1, 4].map(inviteButtonLabel)).toEqual(['Pick friends to invite', 'Send 1 invite', 'Send 4 invites']);
    });

    it('should summarise what an invite request did', () => {
      const names = (userId: string) => userId.toUpperCase();
      expect(inviteSummary({ invited: ['a'], skipped: [] }, names)).toEqual({ tone: 'success', lines: ['Invited A.'] });
      expect(inviteSummary({ invited: ['a', 'b'], skipped: [{ userId: 'c', reason: 'recently_invited' }] }, names)).toEqual({
        tone: 'warning',
        lines: ['Invited 2 players.', 'C: invited recently.'],
      });
      expect(inviteSummary({ invited: [], skipped: [] }, names).lines).toEqual(['Nobody was invited.']);
    });
  });

  describe('podium', () => {
    const entry = (rank: number): PodiumEntry => ({ standing: standing(rank, `p${rank}`), awards: [] });

    it('should place the champion in the middle', () => {
      expect(podiumOrder([entry(1), entry(2), entry(3)]).map((item) => item.standing.rank)).toEqual([2, 1, 3]);
      expect(podiumOrder([entry(1), entry(2)]).map((item) => item.standing.rank)).toEqual([2, 1]);
      expect(podiumOrder([entry(1)]).map((item) => item.standing.rank)).toEqual([1]);
    });

    it('should map ranks to steps', () => {
      expect([1, 2, 3, 4].map(podiumStep)).toEqual(['first', 'second', 'third', 'third']);
    });

    it('should scatter the same confetti for the same tournament', () => {
      const pieces = confettiPieces('tournament-1', 5, 12);
      expect(pieces).toHaveLength(12);
      expect(confettiPieces('tournament-1', 5, 12)).toEqual(pieces);
      expect(confettiPieces('tournament-2', 5, 12)).not.toEqual(pieces);
      for (const piece of pieces) {
        expect(piece.left).toBeGreaterThanOrEqual(0);
        expect(piece.left).toBeLessThan(100);
        expect(piece.color).toBeGreaterThanOrEqual(0);
        expect(piece.color).toBeLessThan(5);
      }
    });
  });
});
