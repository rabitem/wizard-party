/**
 * How a room paces itself: bot moves, reconnect windows and the deadlines that keep a table moving
 * when a player does not (see docs/server/room.md).
 */
import { DEFAULT_GRACE_DURATION_MS, SERVER_DISCONNECT_DEBOUNCE_MS } from '../../shared/domain';

export const ROOM_TIMING = {
  /** Pause before a bot moves (after any change of the table, so bots never outpace it). */
  BOT_ACTION_DELAY_MS: 800,
  /** First retry after a bot turn that could not be applied at all; doubles per failure. */
  BOT_RETRY_BASE_MS: 2_000,
  BOT_RETRY_MAX_MS: 30_000,
  /**
   * How long a closed socket's seat waits for a new socket before it counts as disconnected:
   * longer than the client's first reconnect plus a slow handshake, so a blip never pauses a table.
   */
  DISCONNECT_DEBOUNCE_MS: SERVER_DISCONNECT_DEBOUNCE_MS,
  /** How long a dropped player pauses a running game (and keeps a lobby seat) before losing it. */
  RECONNECT_WINDOW_MS: DEFAULT_GRACE_DURATION_MS,
  /** ROUND_END moves on by itself after this, so an idle host cannot hold the table. */
  ROUND_END_AUTO_ADVANCE_MS: 30_000,
  /** The same when no connected human holds the host seat (nobody could press "next round"). */
  HOSTLESS_ROUND_END_ADVANCE_MS: 5_000,
} as const;

/**
 * What happens when a connected player's turn timer runs out (rooms whose rules set a timer):
 * - `advisory`: the table may heckle them with timeout sounds, nothing else;
 * - `auto-act`: after `autoActAfterMs` of heckling the room makes the deterministic legal move
 *   for them (lowest allowed bid, first legal card, most-held trump suit).
 */
export type TurnTimeoutMode = 'advisory' | 'auto-act';

export interface TurnTimeoutPolicy {
  mode: TurnTimeoutMode;
  /** Time after the timer ran out before the room moves for the player. */
  autoActAfterMs: number;
}

export const TURN_TIMEOUT_POLICY: TurnTimeoutPolicy = {
  mode: 'auto-act',
  autoActAfterMs: 15_000,
};
