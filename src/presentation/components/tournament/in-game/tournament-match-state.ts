import type { TournamentMatchRoomSeat, TournamentMatchRoomState } from '@shared/domain/tournament';
import { TOURNAMENT_GAME_ERROR_CODES } from '@shared/domain';

import { TOURNAMENT_ROUTES } from '@/presentation/config/tournament.config';
import type { TournamentJoinRejection } from '@/presentation/hooks/connection/tournament-join';

/*
 * Presenting the match-room state of a tournament table (parsed by the connection, see
 * hooks/connection/tournament-match.ts). Pure functions, so the lobby, HUD and results screens
 * agree and the rules are unit tested; components only render what these return.
 */

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

export type SeatStatus = 'seated' | 'waiting' | 'no-show';

export function seatStatus(seat: TournamentMatchRoomSeat): SeatStatus {
  if (seat.noShow) return 'no-show';
  return seat.joined ? 'seated' : 'waiting';
}

export interface RosterSummary {
  seated: number;
  /** Humans expected at the table. */
  expected: number;
  noShows: number;
  /** Seats bots will play: the descriptor's bots plus no-shows. */
  botSeats: number;
}

export function rosterSummary(match: TournamentMatchRoomState): RosterSummary {
  const seated = match.roster.filter((seat) => seat.joined && !seat.noShow).length;
  const noShows = match.roster.filter((seat) => seat.noShow).length;
  return { seated, expected: match.roster.length, noShows, botSeats: match.bots + noShows };
}

/** What the lobby of a match room is waiting for. */
export type MatchLobbyPhase =
  /** Everyone is seated: the game starts on its own at `at`. */
  | { kind: 'starting'; at: number }
  /** Waiting for players; at `deadlineAt` the absent ones become no-shows (null: nobody joined yet). */
  | { kind: 'waiting'; deadlineAt: number | null }
  /** The match deadline comes before the start or the no-show deadline: unless started by `at`, the table is voided. */
  | { kind: 'expiring'; at: number }
  /** The match deadline passed before the game could start: the tournament voided the table. */
  | { kind: 'expired' };

export function matchLobbyPhase(match: TournamentMatchRoomState): MatchLobbyPhase {
  if (match.expired) return { kind: 'expired' };
  // The worker acts on whichever comes first; at the match deadline it expires the table.
  const next = match.autoStartAt ?? match.noShowDeadlineAt;
  if (match.deadlineAt !== null && next !== null && match.deadlineAt <= next) return { kind: 'expiring', at: match.deadlineAt };
  if (match.autoStartAt !== null) return { kind: 'starting', at: match.autoStartAt };
  return { kind: 'waiting', deadlineAt: match.noShowDeadlineAt };
}

/** One line under the countdown, so players know what happens when it runs out. */
export function lobbyPhaseHint(phase: MatchLobbyPhase, summary: RosterSummary): string {
  if (phase.kind === 'expired') return 'Its deadline passed before the game could start, so the tournament voided this table. Nothing is played here.';
  if (phase.kind === 'expiring') return 'Its deadline is near: if the game has not started by then, the tournament voids this table.';
  if (phase.kind === 'starting') {
    return summary.botSeats > 0
      ? `Everyone is here. Bots take the ${summary.botSeats === 1 ? 'empty seat' : `${summary.botSeats} empty seats`}.`
      : 'Everyone is here. Shuffling the deck…';
  }
  const missing = summary.expected - summary.seated;
  if (phase.deadlineAt === null) return 'The table opens as soon as the first player sits down.';
  return `If ${missing === 1 ? 'the last player does' : `${missing} players do`} not arrive in time, bots take their seats and the game starts.`;
}

/** Whole seconds left until `at` (never negative). */
export function secondsUntil(at: number, now: number): number {
  return Math.max(0, Math.ceil((at - now) / MS_PER_SECOND));
}

/** "2:05" for 125 seconds, "0:09" for 9. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  return `${minutes}:${String(seconds % SECONDS_PER_MINUTE).padStart(2, '0')}`;
}

/** "Round 2 · Table 3": the short form for the HUD when the label is too long. */
export function roundTableCaption(match: Pick<TournamentMatchRoomState, 'round' | 'table'>): string {
  return `Round ${match.round} · Table ${match.table}`;
}

/** The tournament page; with `rejoin` it fetches a fresh ticket and reopens the viewer's table. */
export function tournamentPagePath(tournamentId: string, options: { rejoin?: boolean } = {}): string {
  return options.rejoin ? TOURNAMENT_ROUTES.join(tournamentId) : TOURNAMENT_ROUTES.detail(tournamentId);
}

const DEADLINE_TIME: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

/** The tournament has voided the table by now if it was not finished: a result no longer counts. */
export function isPastMatchDeadline(match: Pick<TournamentMatchRoomState, 'deadlineAt'>, now: number): boolean {
  return match.deadlineAt !== null && now >= match.deadlineAt;
}

/**
 * "Counts if finished by 18:30" (the deadline on this device's clock, in the viewer's time); null
 * for tables whose ticket carried no deadline. Given `now` past the deadline, it says the game no
 * longer counts.
 */
export function deadlineCaption(
  match: Pick<TournamentMatchRoomState, 'deadlineAt'>,
  options: { locale?: string; timeZone?: string; now?: number } = {}
): string | null {
  if (match.deadlineAt === null) return null;
  if (options.now !== undefined && isPastMatchDeadline(match, options.now)) return 'Past its deadline: this game no longer counts';
  const time = new Intl.DateTimeFormat(options.locale, { ...DEADLINE_TIME, timeZone: options.timeZone }).format(match.deadlineAt);
  return `Counts if finished by ${time}`;
}

/** recording: not handed over yet; sent: on its way; counted / not-counted: the tournament answered. */
export type ResultStatusTone = 'recording' | 'sent' | 'counted' | 'not-counted';

export interface ResultStatus {
  tone: ResultStatusTone;
  text: string;
}

/** How the results screen describes the hand-off of the result to the tournament, and its answer. */
export function resultStatus(match: Pick<TournamentMatchRoomState, 'reported' | 'reportOutcome'>): ResultStatus {
  if (!match.reported) return { tone: 'recording', text: 'Recording the result for the tournament…' };
  switch (match.reportOutcome) {
    case 'recorded':
    case 'duplicate':
      return { tone: 'counted', text: 'Result counted for the tournament. Standings update in a moment.' };
    case 'superseded':
      return { tone: 'not-counted', text: 'This table was voided before the result arrived, so this game does not count for the tournament.' };
    case 'ignored':
      return { tone: 'not-counted', text: 'The tournament was over before the result arrived, so this game does not count.' };
    case 'rejected':
      return { tone: 'not-counted', text: 'The tournament could not record this result, so this game does not count.' };
    case null:
      // Also what a worker from before the answer was shown keeps saying.
      return { tone: 'sent', text: 'Result sent to the tournament. Standings update in a moment.' };
  }
}

export function resultStatusText(match: Pick<TournamentMatchRoomState, 'reported' | 'reportOutcome'>): string {
  return resultStatus(match).text;
}

export interface RejectionCopy {
  title: string;
  body: string;
  /** Primary action: back to the tournament page (fresh ticket when `rejoin`), or the list. */
  action: { label: string; href: string };
}

/** Friendly words for the worker's refusal of a tournament table. */
export function rejectionCopy(rejection: Pick<TournamentJoinRejection, 'code' | 'tournamentId'>): RejectionCopy {
  const tournament = rejection.tournamentId;
  const back = (label: string, rejoin: boolean) =>
    tournament ? { label, href: tournamentPagePath(tournament, { rejoin }) } : { label: 'Browse tournaments', href: TOURNAMENT_ROUTES.LIST };
  switch (rejection.code) {
    case TOURNAMENT_GAME_ERROR_CODES.UNAVAILABLE:
      return {
        title: 'Tournaments are paused',
        body: 'Tournament tables cannot be opened right now. Please try again a little later.',
        action: back('Back to the tournament', false),
      };
    case TOURNAMENT_GAME_ERROR_CODES.NO_SHOW:
      // Final: a fresh pass would be refused again, so the link does not rejoin.
      return {
        title: 'The match went on without you',
        body: 'You were not at the table when it started, so bots took your seat and it counts as a no-show.',
        action: back('Back to the tournament', false),
      };
    case TOURNAMENT_GAME_ERROR_CODES.TICKET_INVALID:
      return {
        title: 'Your seat pass expired',
        body: 'The pass for this table is no longer valid. The tournament page hands out a fresh one.',
        action: back('Get a new seat pass', true),
      };
    case TOURNAMENT_GAME_ERROR_CODES.TICKET_REQUIRED:
    default:
      return {
        title: 'This table is reserved',
        body: 'This is a tournament table. Players join it from their tournament page.',
        action: back('Join from the tournament', true),
      };
  }
}
