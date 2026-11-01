import { describe, expect, it } from 'vitest';

import type { TournamentAwardView, TournamentMatchView, TournamentRoundView } from '@shared/application/use-cases/tournament';
import { DEFAULT_TOURNAMENT_SETTINGS, type Standing } from '@shared/domain/tournament';

import {
  advanceLabel,
  bracketColumns,
  defaultRoundTab,
  describeSeating,
  entryLine,
  fieldFill,
  formatAccuracy,
  formatDuration,
  hostAccess,
  myTournamentsStrip,
  previewStructure,
  registrationAction,
  roundProgress,
  scheduleLine,
  settingsChips,
  tableRows,
  tableSizeLabel,
  tournamentShareUrl,
} from './tournament-view-model';
import { awardsByPlayer, honourAwards, podiumEntries, viewerAwardXp } from './tournament-detail-model';

const player = (userId: string) => ({ userId, username: userId, displayName: userId.toUpperCase() });

function match(overrides: Partial<TournamentMatchView> & Pick<TournamentMatchView, 'id' | 'round' | 'table'>): TournamentMatchView {
  return {
    status: 'pending',
    seats: [],
    createdAt: 0,
    deadlineAt: 0,
    staleAt: 0,
    resolvableAt: 0,
    live: null,
    result: null,
    ...overrides,
  };
}

function round(number: number, matches: TournamentMatchView[], isFinal = false): TournamentRoundView {
  return { round: number, label: isFinal ? 'Final' : `Round ${number}`, isFinal, matches };
}

function standing(rank: number, userId: string, matchesPlayed = 1): Standing {
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
    matchesPlayed,
    roundsPlayed: matchesPlayed,
    reachedRound: 1,
    noShows: 0,
  };
}

function award(awardId: string, userId: string, tier: TournamentAwardView['tier'], xp = 10): TournamentAwardView {
  return { awardId, name: awardId, description: '', icon: 'trophy', tier, xp, player: player(userId) };
}

describe('tournament view model', () => {
  describe('formatDuration', () => {
    it('should format days, hours and minutes compactly', () => {
      expect(formatDuration(2 * 86_400_000 + 3 * 3_600_000)).toBe('2d 3h');
      expect(formatDuration(3 * 3_600_000 + 5 * 60_000)).toBe('3h 05m');
      expect(formatDuration(4 * 60_000 + 5_000)).toBe('4:05');
    });

    it('should never show negative time and round seconds up', () => {
      expect(formatDuration(-5_000)).toBe('0:00');
      expect(formatDuration(1_200)).toBe('0:02');
    });
  });

  describe('scheduleLine', () => {
    const base = { startsAt: null, currentRound: 0, rounds: 3, completedAt: null, cancelledAt: null };

    it('should describe registration with and without a scheduled start', () => {
      expect(scheduleLine({ ...base, status: 'registration' }, 0)).toBe('Starts when the host is ready');
      expect(scheduleLine({ ...base, status: 'registration', startsAt: 10 * 60_000 }, 0)).toBe('Starts in 10:00');
      expect(scheduleLine({ ...base, status: 'registration', startsAt: 1_000 }, 2_000)).toBe('Starting now');
      expect(scheduleLine({ ...base, status: 'registration', startsAt: 5 * 86_400_000 }, 0)).toMatch(/^Starts \S/);
    });

    it('should show the round of a running tournament', () => {
      expect(scheduleLine({ ...base, status: 'running', currentRound: 2 }, 0)).toBe('Round 2 of 3');
      expect(scheduleLine({ ...base, status: 'running', currentRound: 2, rounds: null }, 0)).toBe('Round 2');
    });
  });

  it('should report the share of the field taken', () => {
    expect(fieldFill({ entrantCount: 4, maxEntrants: 16 })).toBe(0.25);
    expect(fieldFill({ entrantCount: 20, maxEntrants: 16 })).toBe(1);
  });

  describe('settings', () => {
    it('should label table sizes and advancement', () => {
      expect(tableSizeLabel(5)).toBe('Tables of 3–5');
      expect(tableSizeLabel(3)).toBe('Tables of 3');
      expect(advanceLabel(null)).toBe('Top half of each table advances');
      expect(advanceLabel(1)).toBe('Table winners advance');
      expect(advanceLabel(2)).toBe('Top 2 of each table advance');
    });

    it('should list format specific chips', () => {
      const series = settingsChips('series', DEFAULT_TOURNAMENT_SETTINGS);
      expect(series).toContain('Swiss Series');
      expect(series).toContain('3 rounds');
      expect(series).toContain('Standard rules');
      const knockout = settingsChips('knockout', { ...DEFAULT_TOURNAMENT_SETTINGS, fillWithBots: true });
      expect(knockout).toContain('Elimination');
      expect(knockout).not.toContain('3 rounds');
      expect(knockout.some((chip) => chip.startsWith('Bots fill tables'))).toBe(true);
    });

    it('should preview the seating and rounds of a field', () => {
      const preview = previewStructure('series', DEFAULT_TOURNAMENT_SETTINGS, 13);
      expect(preview.tables?.map((table) => table.humans)).toEqual([5, 4, 4]);
      expect(preview.rounds).toBe(3);
      expect(preview.problem).toBeNull();
    });

    it('should explain when a field cannot be seated without bots', () => {
      const preview = previewStructure('series', { ...DEFAULT_TOURNAMENT_SETTINGS, maxTableSize: 3 }, 4);
      expect(preview.tables).toBeNull();
      expect(preview.problem).toMatch(/bots/i);
    });

    it('should describe a seating plan', () => {
      expect(describeSeating([{ humans: 5, bots: 0 }, { humans: 4, bots: 0 }, { humans: 4, bots: 0 }])).toBe('3 tables (1×5 + 2×4 seats)');
      expect(describeSeating([{ humans: 2, bots: 1 }])).toBe('1 table (1×3 seats) · 1 bot');
    });
  });

  describe('tableRows', () => {
    const played = match({
      id: 'm1',
      round: 1,
      table: 1,
      status: 'completed',
      seats: [
        { seat: 0, player: player('a') },
        { seat: 1, player: null },
        { seat: 2, player: player('b') },
      ],
      result: {
        outcome: 'played',
        completedAt: 1,
        players: [
          { userId: 'a', placement: 2, score: 40, points: 6, noShow: false, botTakeover: false },
          { userId: 'b', placement: 1, score: 90, points: 12, noShow: false, botTakeover: true },
        ],
      },
    });

    it('should order a played table by placement with bots last', () => {
      const rows = tableRows(played, 'a', new Set(['b']));
      expect(rows.map((row) => row.key)).toEqual(['b', 'a', 'bot-1']);
      expect(rows[0]).toMatchObject({ placement: 1, points: 12, botTakeover: true, advanced: true });
      expect(rows[1]).toMatchObject({ isViewer: true, advanced: false });
      expect(rows[2]).toMatchObject({ isBot: true, displayName: 'Bot', placement: null });
    });

    it('should keep seat order before the table is played', () => {
      const rows = tableRows({ ...played, status: 'pending', result: null }, null);
      expect(rows.map((row) => row.key)).toEqual(['a', 'bot-1', 'b']);
    });
  });

  describe('rounds', () => {
    const seat = (seatNumber: number, userId: string) => ({ seat: seatNumber, player: player(userId) });
    const first = round(1, [
      match({ id: 'r1t1', round: 1, table: 1, status: 'completed', seats: [seat(0, 'a'), seat(1, 'b'), seat(2, 'c')] }),
      match({ id: 'r1t2', round: 1, table: 2, status: 'void', seats: [seat(0, 'd'), seat(1, 'e'), seat(2, 'f')] }),
    ]);
    const second = round(2, [match({ id: 'r2t1', round: 2, table: 1, seats: [seat(0, 'a'), seat(1, 'b'), seat(2, 'd')] })]);

    it('should count played tables of a round', () => {
      expect(roundProgress(first)).toEqual({ played: 2, total: 2, complete: true });
      expect(roundProgress(second)).toEqual({ played: 0, total: 1, complete: false });
    });

    it('should mark advancers and add placeholder columns', () => {
      const columns = bracketColumns([first, second], 3, null);
      expect(columns).toHaveLength(3);
      expect(columns[0].matches[0].rows.filter((row) => row.advanced).map((row) => row.key)).toEqual(['a', 'b']);
      expect(columns[2]).toMatchObject({ round: 3, label: 'Final', upcoming: true, matches: [] });
    });

    it('should not add placeholders once the final is seated', () => {
      expect(bracketColumns([first, round(2, [], true)], 4, null)).toHaveLength(2);
    });

    it('should open the viewer round, else the latest', () => {
      expect(defaultRoundTab([first, second], { myMatch: null })).toBe(2);
      expect(defaultRoundTab([first, second], { myMatch: { matchId: 'x', round: 1, table: 1, label: '', roomCode: '', deadlineAt: 0 } })).toBe(1);
      expect(defaultRoundTab([], { myMatch: null })).toBeNull();
    });
  });

  describe('standings and awards', () => {
    it('should format accuracy', () => {
      expect(formatAccuracy(null)).toBe('—');
      expect(formatAccuracy(0.666)).toBe('67%');
    });

    it('should build the podium from players who played', () => {
      const awards = [award('champion', 'a', 'gold'), award('oracle', 'a', 'special'), award('runner-up', 'b', 'silver')];
      const podium = podiumEntries([standing(1, 'a'), standing(2, 'b'), standing(3, 'c', 0), standing(4, 'd')], awards);
      expect(podium.map((entry) => entry.standing.userId)).toEqual(['a', 'b', 'd']);
      expect(podium[0].awards.map((item) => item.awardId)).toEqual(['champion', 'oracle']);
      expect(awardsByPlayer(awards).get('b')).toHaveLength(1);
      expect(honourAwards(awards).map((item) => item.awardId)).toEqual(['oracle']);
    });

    it('should sum the viewer award XP', () => {
      const awards = [award('champion', 'a', 'gold', 400), award('finisher', 'a', 'participation', 50), award('finisher', 'b', 'participation', 50)];
      expect(viewerAwardXp(awards, 'a')).toBe(450);
      expect(viewerAwardXp(awards, null)).toBe(0);
    });
  });

  describe('registrationAction', () => {
    const viewer = { canRegister: false, canWithdraw: false, registrationBlocker: null, isEntrant: false } as const;
    const account = { signedIn: true };

    it('should offer withdrawal to entrants during registration', () => {
      expect(registrationAction('registration', { ...viewer, canWithdraw: true, isEntrant: true }, account)).toEqual({ kind: 'withdraw' });
    });

    it('should send guests to sign in and let accounts register', () => {
      expect(registrationAction('registration', { ...viewer, registrationBlocker: 'sign_in' }, { signedIn: false })).toEqual({ kind: 'sign_in' });
      expect(registrationAction('registration', { ...viewer, canRegister: true }, { signedIn: true })).toEqual({ kind: 'register' });
      expect(registrationAction('registration', { ...viewer, canRegister: true }, account)).toEqual({ kind: 'register' });
    });

    it('should explain full fields and offer nothing after the start', () => {
      expect(registrationAction('registration', { ...viewer, registrationBlocker: 'full' }, account)).toEqual({ kind: 'full' });
      expect(registrationAction('running', { ...viewer, registrationBlocker: 'closed' }, account)).toEqual({ kind: 'none' });
    });
  });

  it('should build share links with the invite code of private tournaments', () => {
    expect(tournamentShareUrl('https://wizardparty.fun/', 'abc123defg', null)).toBe('https://wizardparty.fun/tournaments/abc123defg');
    expect(tournamentShareUrl('https://wizardparty.fun', 'abc123defg', 'code1234')).toBe('https://wizardparty.fun/tournaments/abc123defg?code=code1234');
  });

  it('should describe my entry', () => {
    expect(entryLine({ status: 'active', finalRank: 2 }, false)).toBe('Finished 2nd');
    expect(entryLine({ status: 'eliminated', finalRank: null }, false)).toBe('Knocked out');
    expect(entryLine(null, true)).toBe('Hosting');
    expect(entryLine(null, false)).toBeNull();
  });

  it('should tell what hosting needs', () => {
    expect(hostAccess({ status: 'loading' })).toBe('loading');
    expect(hostAccess({ status: 'guest' })).toBe('sign_in');
    expect(hostAccess({ status: 'signed-in' })).toBe('ready');
  });

  it('should order my tournaments live, upcoming, then past', () => {
    const strip = myTournamentsStrip({ live: [{ id: 'l' }], upcoming: [{ id: 'u1' }, { id: 'u2' }], past: [{ id: 'p' }] }, 3);
    expect(strip.map((item) => item.id)).toEqual(['l', 'u1', 'u2']);
  });
});
