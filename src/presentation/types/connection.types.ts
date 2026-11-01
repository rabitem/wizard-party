/**
 * Where the game client's realtime connection stands. Owned by the connection layer
 * (GameSession); the UI routes and renders on it instead of on the raw socket flag.
 *
 * - `idle`: no connection was asked for (or it was closed on purpose).
 * - `connecting`: the first connection to a room is being made.
 * - `connected`: the socket is open (the server's GAME_STATE follows).
 * - `reconnecting`: the socket dropped unexpectedly and the client is getting it back by itself.
 *   The table stays mounted; nothing routes away.
 * - `failed`: the automatic retries are spent. A network change or the page coming back still
 *   retries; the player can retry at once.
 * - `superseded`: the seat connected again in another tab or on another device. Terminal until the
 *   player takes the seat back here on purpose.
 * - `kicked`: the host removed this player. Terminal.
 * - `rejected`: the server refused this seat for good (a seat token owned by another session, a
 *   refused tournament seat). Terminal.
 */
export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed'
  | 'superseded'
  | 'kicked'
  | 'rejected';

/** The connection ended for a reason that a retry cannot fix. */
export function isTerminalConnectionStatus(status: ConnectionStatus): boolean {
  return status === 'superseded' || status === 'kicked' || status === 'rejected';
}

/**
 * Without a game state yet, one may still come: the connection is being made or restored, or the
 * socket is open and the join not answered (an error answers a refused join instead). Pages wait
 * then instead of routing away.
 */
export function isAwaitingSeat(status: ConnectionStatus, hasError: boolean): boolean {
  return status === 'connecting' || status === 'reconnecting' || (status === 'connected' && !hasError);
}

/** A dropped connection the client is (or can be) restoring by itself: keep the table up. */
export function isTransientConnectionStatus(status: ConnectionStatus): boolean {
  return status === 'reconnecting' || status === 'failed';
}
