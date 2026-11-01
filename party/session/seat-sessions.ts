import { SessionValidationService } from "../../shared/domain";
import type { ISeatSessionStore, ISessionCredentialFactory } from "../../shared/application";
import type { ServerContext } from "../utils/types";

/** 32 random bytes: 43 base64url characters, far beyond guessing. */
const SESSION_TOKEN_BYTES = 32;
/** Seat ids are public; they only need to be unique and unpredictable enough not to collide. */
const SEAT_ID_BYTES = 12;
const SEAT_ID_PREFIX = 'p_';

function randomBase64Url(byteCount: number): string {
  const bytes = new Uint8Array(byteCount);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Web Crypto backed credentials (available in Workers and Node). */
export const cryptoSessionCredentials: ISessionCredentialFactory = {
  createSeatId: () => `${SEAT_ID_PREFIX}${randomBase64Url(SEAT_ID_BYTES)}`,
  createSessionToken: () => randomBase64Url(SESSION_TOKEN_BYTES),
};

type SeatSessionContext = Pick<ServerContext, 'game' | 'persistentIdToPlayerId' | 'sessionTokens'>;

function seatOfToken(sessionTokens: ReadonlyMap<string, string>, presented: string): string | undefined {
  if (!SessionValidationService.isSessionToken(presented)) return undefined;
  for (const [playerId, token] of sessionTokens) {
    if (SessionValidationService.secretsMatch(token, presented)) return playerId;
  }
  return undefined;
}

/** The room's seat bookkeeping as the application's ISeatSessionStore port. */
export function seatSessionStore(ctx: SeatSessionContext): ISeatSessionStore {
  return {
    seatOfPersistentId: (persistentId) => ctx.persistentIdToPlayerId.get(persistentId),
    seatOfToken: (token) => seatOfToken(ctx.sessionTokens, token),
    hasToken: (playerId) => ctx.sessionTokens.has(playerId),
    isSeated: (playerId) => ctx.game.getPlayer(playerId) !== undefined,
  };
}

/** The seat's token, issued on first use; the same token for every later join of the seat. */
export function issueSessionToken(
  ctx: Pick<ServerContext, 'sessionTokens' | 'sessionCredentials'>,
  playerId: string
): string {
  const existing = ctx.sessionTokens.get(playerId);
  if (existing) return existing;
  const token = ctx.sessionCredentials.createSessionToken();
  ctx.sessionTokens.set(playerId, token);
  return token;
}

/**
 * Seat attestation for the social presence check: which seat does this proof hold? A session token
 * proves its seat; a persistent id proves only a seat that never received a token (a seat id that
 * every player has seen is no proof once the seat is token-protected).
 */
export function attestSeat(ctx: SeatSessionContext, proof: string): string | null {
  const store = seatSessionStore(ctx);
  const byToken = store.seatOfToken(proof);
  if (byToken && store.isSeated(byToken)) return byToken;

  const byPersistentId = store.seatOfPersistentId(proof);
  if (byPersistentId && !store.hasToken(byPersistentId) && store.isSeated(byPersistentId)) return byPersistentId;
  return null;
}

/** Forgets every credential of a seat that left the room for good. */
export function forgetSeatCredentials(
  ctx: Pick<ServerContext, 'persistentIdToPlayerId' | 'sessionTokens'>,
  playerId: string
): string[] {
  ctx.sessionTokens.delete(playerId);
  const persistentIds: string[] = [];
  for (const [persistentId, mappedPlayerId] of ctx.persistentIdToPlayerId) {
    if (mappedPlayerId !== playerId) continue;
    ctx.persistentIdToPlayerId.delete(persistentId);
    persistentIds.push(persistentId);
  }
  return persistentIds;
}

/** The persistent ids that map to a seat (the browsers that played it). */
export function persistentIdsOf(ctx: Pick<ServerContext, 'persistentIdToPlayerId'>, playerId: string): string[] {
  return Array.from(ctx.persistentIdToPlayerId)
    .filter(([, mappedPlayerId]) => mappedPlayerId === playerId)
    .map(([persistentId]) => persistentId);
}
