import { describe, expect, it } from 'vitest';

import { DEFAULT_RULESET_CONFIG } from '@shared/domain/value-objects';
import { DEFAULT_TOURNAMENT_SETTINGS, recordMatchProgress, startTournament, type Tournament } from '@shared/domain/tournament';
import { HOST_ID, T0, playRound, playToCompletion, testDraft, testTournament, withEntrants } from '@shared/domain/tournament/tournament.fixtures';

import { toPostgresJson } from '../telemetry/postgres-json';
import {
  toSettings,
  toSummary,
  toTournament,
  toUserTournamentRow,
  type SummaryRow,
  type TournamentRows,
} from './tournament-rows';
import { toSavePayload, type TournamentSavePayload } from './tournament-save-payload';

/**
 * Mirrors the column mapping of the save statements (payload field -> column), the way the rows
 * come back from the driver: jsonb parsed, timestamps as ISO strings.
 */
function rowsOf(payload: TournamentSavePayload): TournamentRows {
  const t = payload.tournament;
  return {
    tournament: {
      id: t.id,
      name: t.name,
      description: t.description,
      host_user_id: t.hostUserId,
      host_username: t.hostUsername,
      host_display_name: t.hostDisplayName,
      format: t.format,
      settings: t.settings,
      visibility: t.visibility,
      invite_code: t.inviteCode,
      starts_at: t.startsAt,
      status: t.status,
      current_round: t.currentRound,
      version: t.version,
      created_at: t.createdAt,
      started_at: t.startedAt,
      completed_at: t.completedAt,
      cancelled_at: t.cancelledAt,
    },
    entrants: payload.entrants.map((e) => ({
      user_id: e.userId,
      username: e.username,
      display_name: e.displayName,
      level: e.level,
      seed: e.seed,
      status: e.status,
      joined_at: e.joinedAt,
      final_rank: e.final?.rank ?? null,
      final_points: e.final?.points ?? null,
      final_table_wins: e.final?.tableWins ?? null,
      final_matches_played: e.final?.matchesPlayed ?? null,
      final_rounds_played: e.final?.roundsPlayed ?? null,
      final_total_score: e.final?.totalScore ?? null,
      final_flawless: e.final?.flawless ?? null,
    })),
    matches: payload.matches.map((m) => ({
      id: m.id,
      round: m.round,
      table_number: m.table,
      room_code: m.roomCode,
      seats: m.seats,
      status: m.status,
      created_at: m.createdAt,
      deadline_at: m.deadlineAt,
      outcome: m.outcome,
      game_id: m.gameId,
      completed_at: m.completedAt,
      last_activity_at: m.live?.lastActivityAt ?? null,
      live_round: m.live?.round ?? null,
      live_max_rounds: m.live?.maxRounds ?? null,
    })),
    results: payload.results.map((r) => ({
      match_id: r.matchId,
      user_id: r.userId,
      placement: r.placement,
      score: r.score,
      points: r.points,
      rounds: r.rounds,
      no_show: r.noShow,
      bot_takeover: r.botTakeover,
    })),
    // Stored without order; reverse to prove the mapping restores it.
    awards: [...payload.awards].reverse().map((a) => ({ user_id: a.userId, award_id: a.awardId, tier: a.tier, xp: a.xp, awarded_at: a.awardedAt })),
  };
}

/** Through JSON like the jsonb parameter, then back through the rows. */
function roundTrip(tournament: Tournament): Tournament {
  const payload = JSON.parse(toPostgresJson(toSavePayload(tournament))) as TournamentSavePayload;
  return toTournament(rowsOf(payload));
}

const registered = () => withEntrants(testTournament(testDraft({ startsAt: T0 + 3_600_000, description: 'Bring snacks' })), 7);
const running = () => playRound(startTournament(registered(), HOST_ID, T0 + 1000), T0 + 2000);
const completed = () => playToCompletion(startTournament(registered(), HOST_ID, T0 + 1000));

/** The first pending table of `tournament` after the worker reported round 3 of 10 at `at`. */
function withProgress(tournament: Tournament, at: number): Tournament {
  const match = tournament.matches.find((candidate) => candidate.status === 'pending')!;
  const progress = { matchId: match.id, roomCode: match.roomCode, round: 3, maxRounds: 10, at };
  return recordMatchProgress(tournament, progress, at).tournament;
}

describe('tournament rows', () => {
  describe('toTournament(toSavePayload(...))', () => {
    it('should round-trip a tournament in registration', () => {
      const tournament = { ...registered(), version: 3 };
      expect(roundTrip(tournament)).toEqual(tournament);
    });

    it('should round-trip a running tournament with decided and pending tables', () => {
      const tournament = running();
      expect(tournament.matches.some((match) => match.status === 'pending')).toBe(true);
      expect(roundTrip(tournament)).toEqual(tournament);
    });

    it('should round-trip the live state of a table in play (and its absence)', () => {
      const tournament = withProgress(running(), T0 + 2500);
      const live = tournament.matches.filter((match) => match.live !== null);
      expect(live).toHaveLength(1);
      expect(live[0].live).toEqual({ round: 3, maxRounds: 10, lastActivityAt: T0 + 2500 });
      expect(roundTrip(tournament)).toEqual(tournament);
    });

    it('should round-trip a completed tournament with finals and awards in their original order', () => {
      const tournament = completed();
      expect(tournament.status).toBe('completed');
      expect(tournament.awards.length).toBeGreaterThan(0);
      expect(roundTrip(tournament)).toEqual(tournament);
    });

    it('should round-trip a private tournament without host account (deleted host)', () => {
      const base = registered();
      const tournament: Tournament = { ...base, visibility: 'private', inviteCode: 'abcdefgh', host: { ...base.host, userId: null } };
      expect(roundTrip(tournament)).toEqual(tournament);
    });
  });

  describe('toSavePayload', () => {
    it('should leave out matches and awards that are stored unchanged', () => {
      const before = running();
      const loaded = new Set<object>([...before.matches, ...before.awards]);
      const after = playRound(before, T0 + 3000);

      const payload = toSavePayload(after, { isPersisted: (part) => loaded.has(part) });
      const written = new Set(payload.matches.map((match) => match.id));
      const changed = after.matches.filter((match) => !loaded.has(match)).map((match) => match.id);
      expect([...written].sort()).toEqual([...changed].sort());
      expect(payload.matches.length).toBeLessThan(after.matches.length);
      expect(payload.results.every((result) => written.has(result.matchId))).toBe(true);
      expect(payload.entrants).toHaveLength(after.entrants.length);
    });

    it('should write a pending table again when only its live state changed', () => {
      const before = running();
      const loaded = new Set<object>([...before.matches, ...before.awards]);
      const after = withProgress(before, T0 + 2500);

      const payload = toSavePayload(after, { isPersisted: (part) => loaded.has(part) });
      expect(payload.matches).toHaveLength(1);
      expect(payload.matches[0]).toMatchObject({ status: 'pending', live: { round: 3, maxRounds: 10, lastActivityAt: new Date(T0 + 2500).toISOString() } });
      expect(payload.results).toEqual([]);
    });

    it('should write results only for decided tables', () => {
      const payload = toSavePayload(running());
      const decided = new Set(payload.matches.filter((match) => match.status !== 'pending').map((match) => match.id));
      expect(payload.results.length).toBeGreaterThan(0);
      expect(payload.results.every((result) => decided.has(result.matchId))).toBe(true);
    });
  });

  describe('toSettings', () => {
    it('should fill rules added after the tournament was stored with their defaults', () => {
      const { card: _card, ...olderRuleset } = DEFAULT_RULESET_CONFIG;
      const settings = toSettings({ ...DEFAULT_TOURNAMENT_SETTINGS, maxTableSize: 4, rulesetConfig: olderRuleset });
      expect(settings.maxTableSize).toBe(4);
      expect(settings.rulesetConfig.card).toEqual(DEFAULT_RULESET_CONFIG.card);
    });

    it('should fall back to the defaults for an unreadable value', () => {
      expect(toSettings(null)).toEqual({ ...DEFAULT_TOURNAMENT_SETTINGS, rulesetConfig: toSettings({}).rulesetConfig });
    });
  });

  describe('toSummary', () => {
    const row = (overrides: Partial<SummaryRow> = {}): SummaryRow => ({
      ...rowsOf(toSavePayload(registered())).tournament,
      created_at: new Date(T0),
      entrant_count: 7,
      champion_user_id: 'u01',
      champion_username: 'u01',
      champion_display_name: 'U01',
      ...overrides,
    });

    it('should read the list fields from the settings and accept Date timestamps', () => {
      const summary = toSummary(row());
      expect(summary).toMatchObject({ entrantCount: 7, maxEntrants: DEFAULT_TOURNAMENT_SETTINGS.maxEntrants, createdAt: T0, startsAt: T0 + 3_600_000 });
    });

    it('should name a champion for completed tournaments only', () => {
      expect(toSummary(row()).champion).toBeNull();
      expect(toSummary(row({ status: 'completed', completed_at: new Date(T0) })).champion).toEqual({ userId: 'u01', username: 'u01', displayName: 'U01' });
      expect(toSummary(row({ status: 'completed', completed_at: new Date(T0), champion_user_id: null })).champion).toBeNull();
    });

    it('should map the viewer entry of "my tournaments" (null when only hosting)', () => {
      const base = { ...row(), is_host: true, entry_status: null, entry_seed: null, entry_final_rank: null };
      expect(toUserTournamentRow(base).entry).toBeNull();
      expect(toUserTournamentRow({ ...base, entry_status: 'active', entry_seed: 2, entry_final_rank: 1 }).entry).toEqual({ status: 'active', seed: 2, finalRank: 1 });
    });
  });
});
