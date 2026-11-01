/**
 * Reconnect timing shared by the client and the game server, so a network blip resolves through
 * the client's own reconnect before the server treats the seat as gone (and pauses the table).
 */
export const RECONNECT_TIMING = {
  /** The client's first automatic reconnect attempt after an unexpected close (then it doubles). */
  CLIENT_FIRST_RETRY_MS: 1_000,
  /** A slow WebSocket handshake plus the JOIN round trip (mobile p95 with margin). */
  HANDSHAKE_ALLOWANCE_MS: 3_000,
} as const;

/**
 * How long the server keeps a seat whose socket closed before it counts as disconnected: the
 * client's first retry plus a slow handshake.
 */
export const SERVER_DISCONNECT_DEBOUNCE_MS =
  RECONNECT_TIMING.CLIENT_FIRST_RETRY_MS + RECONNECT_TIMING.HANDSHAKE_ALLOWANCE_MS;
