/**
 * What a room knows about its seats and their credentials. The game server implements it over
 * its own bookkeeping; the application decides with it who may take which seat (see claimSeat).
 */
export interface ISeatSessionStore {
  /** The seat a persistent id holds in this room, if any. */
  seatOfPersistentId(persistentId: string): string | undefined;
  /** The seat a session token opens, if any (compared in constant time). */
  seatOfToken(sessionToken: string): string | undefined;
  /** True once the seat was issued a token: from then on only that token opens it. */
  hasToken(playerId: string): boolean;
  /** True while the seat is part of the game. */
  isSeated(playerId: string): boolean;
}

/** Source of the server-generated identifiers of a seat. Must be cryptographically random. */
export interface ISessionCredentialFactory {
  /** A public, opaque seat id (it is shown to every player, so it proves nothing). */
  createSeatId(): string;
  /** A secret token that resumes the seat; only ever sent to the seat's own connection. */
  createSessionToken(): string;
}
