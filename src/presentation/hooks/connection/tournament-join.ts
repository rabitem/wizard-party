import { TOURNAMENT_GAME_ERROR_CODES } from '@shared/domain';
import { tournamentTicketStorageKey } from '@shared/tournament';

import { clearMatchTicket, parseStoredMatchTicket } from '@/lib/tournament/match-ticket-storage';
import { safeSessionStorage } from '@/lib/storage';

/*
 * Tournament side of the JOIN path: which ticket goes with JOIN_GAME (the tournament page stores
 * it in sessionStorage, see match-ticket-storage), and how the worker's refusal of a match room
 * becomes a lasting state the lobby can explain instead of a toast that disappears.
 */

/** Codes the worker answers a JOIN_GAME with when it refuses a seat at a tournament table. */
export const TOURNAMENT_JOIN_REJECTION_CODES = [
  TOURNAMENT_GAME_ERROR_CODES.TICKET_REQUIRED,
  TOURNAMENT_GAME_ERROR_CODES.TICKET_INVALID,
  TOURNAMENT_GAME_ERROR_CODES.NO_SHOW,
  TOURNAMENT_GAME_ERROR_CODES.UNAVAILABLE,
] as const;

/** Refusals after which the stored ticket is useless (resending it can only fail again). */
const TICKET_ENDING_CODES: readonly TournamentJoinRejectionCode[] = [TOURNAMENT_GAME_ERROR_CODES.TICKET_INVALID, TOURNAMENT_GAME_ERROR_CODES.NO_SHOW];

export type TournamentJoinRejectionCode = (typeof TOURNAMENT_JOIN_REJECTION_CODES)[number];

export interface TournamentJoinRejection {
  code: TournamentJoinRejectionCode;
  /** The worker's explanation. */
  message: string;
  roomId: string;
  /** Tournament of the stored ticket (for "back to the tournament"); null when there was none. */
  tournamentId: string | null;
}

export interface TournamentJoin {
  /** Spread into the JOIN_GAME command. */
  fields: { tournamentTicket?: string };
  /** Tournament the room's stored ticket belongs to, also when that ticket just expired. */
  tournamentId: string | null;
}

/** Where the tournament page keeps match tickets (sessionStorage in the browser). */
export type TicketStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function sessionTickets(): TicketStorage | null {
  return typeof window === 'undefined' ? null : safeSessionStorage;
}

export function isTournamentJoinRejectionCode(code: unknown): code is TournamentJoinRejectionCode {
  return (TOURNAMENT_JOIN_REJECTION_CODES as readonly unknown[]).includes(code);
}

/**
 * What a JOIN_GAME to `roomId` carries: the stored ticket. It is sent even after it expired: the
 * worker seats nobody new with it, but lets its holder take back a seat they already hold (a game
 * running longer than the ticket). Every rejoin needs it, since the worker never seats anybody by
 * persistent id alone. A refusal drops it and links back to the tournament page for a fresh one.
 */
export function prepareTournamentJoin(roomId: string, storage: TicketStorage | null = sessionTickets()): TournamentJoin {
  let raw: string | null = null;
  try {
    raw = storage?.getItem(tournamentTicketStorageKey(roomId)) ?? null;
  } catch {
    return { fields: {}, tournamentId: null };
  }
  if (raw === null) return { fields: {}, tournamentId: null };
  const stored = parseStoredMatchTicket(raw);
  if (!stored) {
    clearMatchTicket(roomId, storage);
    return { fields: {}, tournamentId: null };
  }
  return { fields: { tournamentTicket: stored.ticket }, tournamentId: stored.tournamentId };
}

/** The lasting refusal state. A refused ticket is dropped: resending it can only fail again. */
export function toTournamentJoinRejection(
  code: TournamentJoinRejectionCode,
  message: string,
  roomId: string,
  tournamentId: string | null,
  storage: TicketStorage | null = sessionTickets()
): TournamentJoinRejection {
  if (TICKET_ENDING_CODES.includes(code)) clearMatchTicket(roomId, storage);
  return { code, message, roomId, tournamentId };
}
