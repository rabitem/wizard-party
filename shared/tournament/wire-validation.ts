import { isTournamentId, matchRoomCode, parseMatchId } from '../domain/tournament/tournament-ids';
import { TOURNAMENT_WIRE_LIMITS } from './tournament-wire';

/* Field checks shared by the parsers of the worker's signed reports (results and progress). */

const GAME_ID = /^[A-Za-z0-9_:.-]+$/;

export function isInt(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

export function isGameId(value: unknown): value is string {
  return typeof value === 'string' && value.length <= TOURNAMENT_WIRE_LIMITS.MAX_GAME_ID_LENGTH && GAME_ID.test(value);
}

/** The ids bind together: the match belongs to the tournament and the room is the match's room. */
export function hasConsistentIds(raw: Record<string, unknown>): raw is Record<string, unknown> & { tid: string; mid: string; room: string } {
  if (!isTournamentId(raw.tid) || typeof raw.mid !== 'string') return false;
  const match = parseMatchId(raw.mid);
  return match !== null && match.tournamentId === raw.tid && raw.room === matchRoomCode(raw.mid);
}
