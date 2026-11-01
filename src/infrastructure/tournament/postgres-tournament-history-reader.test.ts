import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  rows: [] as unknown[],
  queries: [] as { text: string; values: unknown[] }[],
}));
vi.mock('server-only', () => ({}));
vi.mock('../db/neon', () => ({
  getSql: () => (strings: TemplateStringsArray, ...values: unknown[]) => {
    db.queries.push({ text: strings.join('?'), values });
    return Promise.resolve(db.rows);
  },
}));

import {
  PostgresTournamentHistoryReader,
  type EntryRow,
  type MatchResultExportRow,
  type ParticipationRow,
  type TrophyRow,
} from './postgres-tournament-history-reader';

const participationRow = (overrides: Partial<ParticipationRow> = {}): ParticipationRow => ({
  id: 'abcdefghij12',
  name: 'Solstice Cup',
  format: 'knockout',
  completed_at: '2027-01-15T12:00:00.000Z',
  current_round: 3,
  entrants: 12,
  was_host: false,
  was_entrant: true,
  final_rank: 1,
  final_matches_played: 3,
  final_table_wins: 3,
  final_rounds_played: 3,
  final_flawless: true,
  awards: [{ awardId: 'champion', tier: 'gold', xp: 440 }],
  ...overrides,
});

describe('PostgresTournamentHistoryReader', () => {
  beforeEach(() => {
    db.rows = [];
    db.queries = [];
  });

  it('should map completed participations of entrants', async () => {
    db.rows = [participationRow()];
    const [participation] = await new PostgresTournamentHistoryReader().participations('user-1');
    expect(participation).toEqual({
      tournamentId: 'abcdefghij12',
      name: 'Solstice Cup',
      format: 'knockout',
      finishedAt: Date.UTC(2027, 0, 15, 12),
      entrants: 12,
      wasHost: false,
      wasEntrant: true,
      finalRank: 1,
      matchesPlayed: 3,
      tableWins: 3,
      roundsPlayed: 3,
      totalRounds: 3,
      flawless: true,
      awards: [{ awardId: 'champion', tier: 'gold', xp: 440 }],
    });
    const [query] = db.queries;
    expect(query.text).toContain("t.status = 'completed'");
    expect(query.values.every((value) => value === 'user-1')).toBe(true);
  });

  it('should map hosts who did not play with neutral entrant facts', async () => {
    db.rows = [
      participationRow({
        was_host: true,
        was_entrant: false,
        final_rank: null,
        final_matches_played: null,
        final_table_wins: null,
        final_rounds_played: null,
        final_flawless: null,
        awards: null,
      }),
    ];
    const [participation] = await new PostgresTournamentHistoryReader().participations('host-1');
    expect(participation).toMatchObject({ wasHost: true, wasEntrant: false, finalRank: null, matchesPlayed: 0, tableWins: 0, flawless: false, awards: [] });
  });

  it('should map trophies newest first as returned and pass the limit', async () => {
    const row: TrophyRow = {
      tournament_id: 'abcdefghij12',
      tournament_name: 'Solstice Cup',
      format: 'series',
      award_id: 'oracle',
      tier: 'special',
      xp: 220,
      awarded_at: new Date(Date.UTC(2027, 0, 15)),
      entrants: 9,
      final_rank: 4,
    };
    db.rows = [row];
    const trophies = await new PostgresTournamentHistoryReader().trophies('user-1', 24);
    expect(trophies).toEqual([
      {
        tournamentId: 'abcdefghij12',
        tournamentName: 'Solstice Cup',
        format: 'series',
        awardId: 'oracle',
        tier: 'special',
        xp: 220,
        awardedAt: Date.UTC(2027, 0, 15),
        entrants: 9,
        finalRank: 4,
      },
    ]);
    expect(db.queries[0].values).toEqual(['user-1', 24]);
  });

  it('should export the stored entries with their registration snapshot', async () => {
    const row: EntryRow = {
      tournament_id: 'abcdefghij12',
      username: 'merlin',
      display_name: 'Merlin',
      level: 12,
      seed: 3,
      status: 'eliminated',
      joined_at: '2027-01-10T08:00:00.000Z',
    };
    db.rows = [row];
    expect(await new PostgresTournamentHistoryReader().entries('user-1', 50)).toEqual([
      { tournamentId: 'abcdefghij12', username: 'merlin', displayName: 'Merlin', level: 12, seed: 3, status: 'eliminated', joinedAt: Date.UTC(2027, 0, 10, 8) },
    ]);
    expect(db.queries[0].values).toEqual(['user-1', 50]);
  });

  it('should export every stored per-table result, including bids and tricks', async () => {
    const row: MatchResultExportRow = {
      tournament_id: 'abcdefghij12',
      match_id: 'abcdefghij12-1-2',
      round: 1,
      table_number: 2,
      match_status: 'completed',
      completed_at: '2027-01-15T12:00:00.000Z',
      placement: 2,
      score: 80,
      points: 6,
      rounds: [{ bid: 1, tricksWon: 1, roundScore: 30 }],
      no_show: false,
      bot_takeover: true,
    };
    db.rows = [row, { ...row, match_id: 'abcdefghij12-2-1', match_status: 'void', completed_at: null, rounds: null }];
    const [played, voided] = await new PostgresTournamentHistoryReader().matchResults('user-1', 50);
    expect(played).toEqual({
      tournamentId: 'abcdefghij12',
      matchId: 'abcdefghij12-1-2',
      round: 1,
      table: 2,
      matchStatus: 'completed',
      completedAt: Date.UTC(2027, 0, 15, 12),
      placement: 2,
      score: 80,
      points: 6,
      rounds: [{ bid: 1, tricksWon: 1, roundScore: 30 }],
      noShow: false,
      botTakeover: true,
    });
    expect(voided).toMatchObject({ matchStatus: 'void', completedAt: null, rounds: [] });
  });
});
