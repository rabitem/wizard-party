import { describe, expect, it } from 'vitest';

import { TOURNAMENT_GAME_ERROR_CODES } from '@shared/domain';
import type { TournamentMatchRoomState } from '@shared/domain/tournament';

import {
  deadlineCaption,
  formatClock,
  isPastMatchDeadline,
  lobbyPhaseHint,
  matchLobbyPhase,
  rejectionCopy,
  resultStatus,
  resultStatusText,
  rosterSummary,
  roundTableCaption,
  seatStatus,
  secondsUntil,
  tournamentPagePath,
} from './tournament-match-state';

const TID = 'abcdefghjk23';

function match(overrides: Partial<TournamentMatchRoomState> = {}): TournamentMatchRoomState {
  return {
    tournamentId: TID,
    matchId: `${TID}-2-3`,
    label: 'Spring Cup · Round 2 · Table 3',
    round: 2,
    table: 3,
    roster: [
      { name: 'Merlin', seat: 0, joined: true, noShow: false },
      { name: 'Morgana', seat: 1, joined: false, noShow: false },
      { name: 'Gandalf', seat: 2, joined: false, noShow: true },
    ],
    bots: 1,
    autoStartAt: null,
    noShowDeadlineAt: 60_000,
    reported: false,
    reportOutcome: null,
    deadlineAt: null,
    expired: false,
    ...overrides,
  };
}

describe('tournament match state', () => {
  it('should describe every seat', () => {
    expect(match().roster.map(seatStatus)).toEqual(['seated', 'waiting', 'no-show']);
  });

  it('should count seated players, no-shows and bot seats', () => {
    expect(rosterSummary(match())).toEqual({ seated: 1, expected: 3, noShows: 1, botSeats: 2 });
  });

  describe('matchLobbyPhase', () => {
    it('should count down to the start once everyone is seated', () => {
      expect(matchLobbyPhase(match({ autoStartAt: 5_000 }))).toEqual({ kind: 'starting', at: 5_000 });
    });

    it('should wait for players until the no-show deadline', () => {
      expect(matchLobbyPhase(match())).toEqual({ kind: 'waiting', deadlineAt: 60_000 });
      expect(matchLobbyPhase(match({ noShowDeadlineAt: null }))).toEqual({ kind: 'waiting', deadlineAt: null });
    });

    it('should show a table whose deadline passed before the start as expired', () => {
      const expired = match({ expired: true, autoStartAt: null, noShowDeadlineAt: null });
      expect(matchLobbyPhase(expired)).toEqual({ kind: 'expired' });
      expect(lobbyPhaseHint(matchLobbyPhase(expired), rosterSummary(expired))).toMatch(/voided this table/);
    });

    it('should count down to the match deadline when it comes before the no-show deadline or the start', () => {
      const waiting = match({ deadlineAt: 30_000 });
      expect(matchLobbyPhase(waiting)).toEqual({ kind: 'expiring', at: 30_000 });
      expect(lobbyPhaseHint(matchLobbyPhase(waiting), rosterSummary(waiting))).toMatch(/voids this table/);
      expect(matchLobbyPhase(match({ autoStartAt: 5_000, deadlineAt: 5_000 }))).toEqual({ kind: 'expiring', at: 5_000 });
      // A later deadline changes nothing.
      expect(matchLobbyPhase(match({ deadlineAt: 90_000 }))).toEqual({ kind: 'waiting', deadlineAt: 60_000 });
      expect(matchLobbyPhase(match({ autoStartAt: 5_000, deadlineAt: 90_000 }))).toEqual({ kind: 'starting', at: 5_000 });
    });
  });

  describe('lobbyPhaseHint', () => {
    it('should explain what happens when the countdown ends', () => {
      const waiting = match();
      expect(lobbyPhaseHint(matchLobbyPhase(waiting), rosterSummary(waiting))).toBe('If 2 players do not arrive in time, bots take their seats and the game starts.');
      const lastOne = match({ roster: [{ name: 'Merlin', seat: 0, joined: true, noShow: false }, { name: 'Morgana', seat: 1, joined: false, noShow: false }] });
      expect(lobbyPhaseHint(matchLobbyPhase(lastOne), rosterSummary(lastOne))).toContain('the last player does not arrive');
      expect(lobbyPhaseHint({ kind: 'waiting', deadlineAt: null }, rosterSummary(waiting))).toContain('first player sits down');
    });

    it('should mention bots filling seats when the game is about to start', () => {
      const full = match({ autoStartAt: 1, bots: 0, roster: [{ name: 'Merlin', seat: 0, joined: true, noShow: false }] });
      expect(lobbyPhaseHint(matchLobbyPhase(full), rosterSummary(full))).toBe('Everyone is here. Shuffling the deck…');
      expect(lobbyPhaseHint(matchLobbyPhase(match({ autoStartAt: 1 })), rosterSummary(match()))).toBe('Everyone is here. Bots take the 2 empty seats.');
      const oneBot = match({ autoStartAt: 1, bots: 1, roster: [{ name: 'Merlin', seat: 0, joined: true, noShow: false }] });
      expect(lobbyPhaseHint(matchLobbyPhase(oneBot), rosterSummary(oneBot))).toBe('Everyone is here. Bots take the empty seat.');
    });
  });

  it('should count down in whole seconds and format a clock', () => {
    expect(secondsUntil(10_001, 0)).toBe(11);
    expect(secondsUntil(0, 5_000)).toBe(0);
    expect(formatClock(125)).toBe('2:05');
    expect(formatClock(9)).toBe('0:09');
    expect(formatClock(-3)).toBe('0:00');
  });

  it('should caption the round and table', () => {
    expect(roundTableCaption(match())).toBe('Round 2 · Table 3');
  });

  it('should link back to the tournament, optionally reopening the table', () => {
    expect(tournamentPagePath(TID)).toBe(`/tournaments/${TID}`);
    expect(tournamentPagePath(TID, { rejoin: true })).toBe(`/tournaments/${TID}?join=1`);
  });

  it('should describe the hand-off of the result', () => {
    expect(resultStatusText({ reported: false, reportOutcome: null })).toContain('Recording');
    expect(resultStatusText({ reported: true, reportOutcome: null })).toContain('sent to the tournament');
  });

  it('should say whether the tournament counted the result', () => {
    expect(resultStatus({ reported: true, reportOutcome: 'recorded' })).toMatchObject({ tone: 'counted', text: expect.stringContaining('counted') });
    // A re-delivery of a recorded result counts like the first one.
    expect(resultStatus({ reported: true, reportOutcome: 'duplicate' }).tone).toBe('counted');
    const superseded = resultStatus({ reported: true, reportOutcome: 'superseded' });
    expect(superseded.tone).toBe('not-counted');
    expect(superseded.text).toMatch(/voided before the result arrived, so this game does not count/);
    expect(resultStatus({ reported: true, reportOutcome: 'ignored' })).toMatchObject({ tone: 'not-counted', text: expect.stringContaining('does not count') });
    // Refused for good (purged tournament, roster mismatch): never "sent" or "counted".
    expect(resultStatus({ reported: true, reportOutcome: 'rejected' })).toMatchObject({ tone: 'not-counted', text: expect.stringContaining('could not record') });
    expect(resultStatus({ reported: false, reportOutcome: null }).tone).toBe('recording');
  });

  it("should caption the deadline in the viewer's time, and nothing without one", () => {
    const deadlineAt = Date.UTC(2026, 9, 30, 18, 30);
    expect(deadlineCaption({ deadlineAt }, { locale: 'en-GB', timeZone: 'UTC' })).toBe('Counts if finished by 18:30');
    expect(deadlineCaption({ deadlineAt: null })).toBeNull();
    expect(deadlineCaption({ deadlineAt }, { locale: 'en-GB', timeZone: 'UTC', now: deadlineAt - 1 })).toBe('Counts if finished by 18:30');
    expect(deadlineCaption({ deadlineAt }, { now: deadlineAt })).toBe('Past its deadline: this game no longer counts');
    expect(isPastMatchDeadline({ deadlineAt }, deadlineAt - 1)).toBe(false);
    expect(isPastMatchDeadline({ deadlineAt }, deadlineAt)).toBe(true);
    expect(isPastMatchDeadline({ deadlineAt: null }, Number.MAX_SAFE_INTEGER)).toBe(false);
  });

  describe('rejectionCopy', () => {
    it('should offer a fresh ticket from the tournament page when the ticket was refused', () => {
      const copy = rejectionCopy({ code: TOURNAMENT_GAME_ERROR_CODES.TICKET_INVALID, tournamentId: TID });
      expect(copy.action.href).toBe(`/tournaments/${TID}?join=1`);
    });

    it('should treat a no-show as final: back to the tournament, no fresh ticket', () => {
      const copy = rejectionCopy({ code: TOURNAMENT_GAME_ERROR_CODES.NO_SHOW, tournamentId: TID });
      expect(copy.action.href).toBe(`/tournaments/${TID}`);
      expect(copy.title).toBe('The match went on without you');
    });

    it('should send players without a known tournament to the list', () => {
      const copy = rejectionCopy({ code: TOURNAMENT_GAME_ERROR_CODES.TICKET_REQUIRED, tournamentId: null });
      expect(copy.action).toEqual({ label: 'Browse tournaments', href: '/tournaments' });
    });

    it('should not ask for a new ticket while tournaments are unavailable', () => {
      const copy = rejectionCopy({ code: TOURNAMENT_GAME_ERROR_CODES.UNAVAILABLE, tournamentId: TID });
      expect(copy.action.href).toBe(`/tournaments/${TID}`);
      expect(copy.title).toBe('Tournaments are paused');
    });
  });
});
