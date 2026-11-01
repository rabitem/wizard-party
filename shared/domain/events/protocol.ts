/**
 * The wire contract between the game server and its clients that is not a command or an event
 * payload: protocol versions, WebSocket close codes and the error codes of the protocol boundary.
 *
 * Both sides import these values, so a close code or error code can never drift apart.
 */

/**
 * Version 2 (current):
 * - the server generates an opaque public seat id and issues a secret session token (SESSION
 *   message); resuming a seat that holds a token requires that token,
 * - GAME_STATE carries a monotonic `stateVersion` and no shared sounds,
 * - shared custom sounds arrive in their own SHARED_SOUNDS message, only when they change,
 * - PING is answered with PONG (liveness without a full snapshot),
 * - ERROR carries the `code` and the `requestId` of the command it refuses.
 */
export const PROTOCOL_VERSION = 2;

/**
 * Clients that send no `protocolVersion` in JOIN_GAME speak the original protocol: their seat id is
 * their persistent id and the persistent id is their credential. The server keeps serving them so a
 * client and server of different releases can coexist during a deploy; such a seat is upgraded (gets
 * a token, after which the persistent id no longer opens it) the first time a version-2 client
 * resumes it.
 */
export const LEGACY_PROTOCOL_VERSION = 1;

/** True for a client that speaks the original protocol (no tokens, sounds inside GAME_STATE). */
export function isLegacyProtocol(protocolVersion: number): boolean {
  return protocolVersion <= LEGACY_PROTOCOL_VERSION;
}

/**
 * Request header carrying a seat proof (a session token, or a legacy persistent id) when the web
 * app asks the game worker which seat a player holds. A header instead of a query parameter keeps
 * the secret out of URLs and request logs.
 */
export const SEAT_PROOF_HEADER = 'x-seat-proof';

/** Application close codes (4000-4999) the server uses when it ends a connection on purpose. */
export const ConnectionCloseCode = {
  /** The same seat connected again elsewhere (another tab or device); do not auto-reconnect. */
  SUPERSEDED: 4000,
  /** The host removed this player from the lobby; do not auto-reconnect. */
  KICKED: 4001,
} as const;

export type ConnectionCloseCode = (typeof ConnectionCloseCode)[keyof typeof ConnectionCloseCode];

/** The close reason sent with each close code. */
export const ConnectionCloseReason = {
  SUPERSEDED: 'superseded',
  KICKED: 'kicked',
} as const;

export type ConnectionCloseReason = (typeof ConnectionCloseReason)[keyof typeof ConnectionCloseReason];

/** True when the server closed the socket on purpose and the client must not reconnect by itself. */
export function isTerminalCloseCode(code: number): boolean {
  return code === ConnectionCloseCode.SUPERSEDED || code === ConnectionCloseCode.KICKED;
}

/**
 * Error codes for commands refused at the protocol boundary, before any use case ran. Domain
 * refusals carry their GameError code instead (e.g. NOT_YOUR_TURN, SESSION_REJECTED).
 */
export const ProtocolErrorCode = {
  /** The command's payload has the wrong shape, type, range or length. */
  INVALID_COMMAND: 'INVALID_COMMAND',
  /** The frame is larger than any command of its type may be. */
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  /** The connection sent this kind of command faster than its budget allows. */
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export type ProtocolErrorCode = (typeof ProtocolErrorCode)[keyof typeof ProtocolErrorCode];
