import { SessionRejectedError, isLegacyProtocol } from '../../../domain';
import type { ISeatSessionStore } from '../../ports/seat-sessions.port';

/** Who is asking for a seat, as presented in JOIN_GAME. */
export interface SeatClaimRequest {
  persistentId: string;
  sessionToken?: string;
  protocolVersion: number;
  /**
   * The seat a credential verified outside the room's own bookkeeping proves this request holds
   * (a tournament ticket names the account, and the account holds the seat).
   */
  attestedPlayerId?: string;
}

/** How the claim was proven. */
export type SeatProof = 'attested' | 'session-token' | 'legacy-persistent-id';

export type SeatClaim =
  /** An existing seat, proven by its token or (for a seat that never got one) its persistent id. */
  | { kind: 'resume'; playerId: string; proof: SeatProof }
  /** No seat to resume: the join creates one (subject to the lobby rules). */
  | { kind: 'new' };

/** Clients newer than the legacy protocol receive (and must present) session tokens. */
export function usesSessionTokens(protocolVersion: number): boolean {
  return !isLegacyProtocol(protocolVersion);
}

/**
 * Decides which seat a join may take. The public player id is never a credential:
 * 0. a seat attested by a verified external credential (a tournament ticket) is resumed;
 * 1. a session token opens the seat it was issued for;
 * 2. a persistent id opens its seat only while that seat has never been issued a token (seats
 *    created by legacy clients, or before tokens existed) - the migration path;
 * 3. a persistent id that maps to a token-protected seat is refused, so reading or guessing a
 *    persistent id never takes over somebody's seat.
 * A token the room does not know (another room, a finished game) is ignored, not refused.
 */
export function claimSeat(request: SeatClaimRequest, store: ISeatSessionStore): SeatClaim {
  if (request.attestedPlayerId && store.isSeated(request.attestedPlayerId)) {
    return { kind: 'resume', playerId: request.attestedPlayerId, proof: 'attested' };
  }
  if (request.sessionToken) {
    const seat = store.seatOfToken(request.sessionToken);
    if (seat && store.isSeated(seat)) return { kind: 'resume', playerId: seat, proof: 'session-token' };
  }

  const seat = store.seatOfPersistentId(request.persistentId);
  if (!seat || !store.isSeated(seat)) return { kind: 'new' };
  if (store.hasToken(seat)) throw new SessionRejectedError();
  return { kind: 'resume', playerId: seat, proof: 'legacy-persistent-id' };
}
