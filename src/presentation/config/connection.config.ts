/**
 * How the game client keeps its realtime connection: reconnect backoff, the connect watchdog,
 * zombie-socket detection and the command outbox. See docs/client/connection.md.
 */
import { RECONNECT_TIMING } from '@shared/domain';

export const RECONNECT_POLICY = {
  /**
   * Ceiling of the first retry after an unexpected close. Shared with the server: its disconnect
   * debounce outlasts this retry plus a slow handshake, so a blip never pauses the table.
   */
  BASE_DELAY_MS: RECONNECT_TIMING.CLIENT_FIRST_RETRY_MS,
  /** Ceiling of any later retry; the ceiling doubles per attempt up to this. */
  MAX_DELAY_MS: 10_000,
  /**
   * Retries are spread over [MIN_DELAY_MS, ceiling] (full jitter with a floor): after a server
   * restart every client of a room reconnects at a different moment.
   */
  MIN_DELAY_MS: 250,
  /**
   * Automatic retries before the connection counts as failed (about two minutes of attempts). A
   * failed connection still retries when the browser reports the network back or the page is shown.
   */
  MAX_ATTEMPTS: 16,
} as const;

export const CONNECTION_TIMING = {
  /**
   * A socket that has not opened by then is closed and retried. The PartySocket adapter enforces
   * it itself; the session's watchdog covers transports that do not.
   */
  CONNECT_TIMEOUT_MS: 6_000,
  /** A socket event later than this after its server timestamp is traced as a warning. */
  TRACE_LAG_WARNING_MS: 1_500,
} as const;

/**
 * Zombie sockets: connections the network or the OS dropped without the browser firing `close`
 * (iOS Safari after backgrounding, a network switch). Their `readyState` stays OPEN.
 */
export const CONNECTION_LIVENESS = {
  /** Without any message for this long, the line counts as suspect and is probed. */
  QUIET_MS: 25_000,
  /** A probe that gets no answer within this long means the socket is dead. */
  PROBE_TIMEOUT_MS: 4_000,
  /**
   * A command that sees no message at all within this long probes the line at once, so a command
   * sent into a dead socket is noticed in about COMMAND_ANSWER_MS + PROBE_TIMEOUT_MS, not after
   * the quiet period.
   */
  COMMAND_ANSWER_MS: 2_500,
  /** How often a visible page checks for quiet lines. */
  CHECK_INTERVAL_MS: 5_000,
} as const;

export const COMMAND_OUTBOX = {
  /** Unsettled commands kept for a resend after a reconnect (oldest dropped first). */
  MAX_SIZE: 20,
  /**
   * An unsettled command older than this is dropped instead of resent: the moment it was meant
   * for has passed. The server remembers applied requestIds for longer, so a resend is safe.
   */
  COMMAND_TTL_MS: 30_000,
} as const;
