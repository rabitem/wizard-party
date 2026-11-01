import { GamePhase, getPauseDeadline, getTrickPresentationMs, type Game } from '../../shared/domain';
import { ROOM_TIMING, TURN_TIMEOUT_POLICY, type TurnTimeoutPolicy } from '../config/room-timing.config';

/**
 * The durable deadlines of a room, all derived from the persisted game state, so they survive an
 * eviction and can never disagree with it. The room's one storage alarm is armed for the earliest;
 * when it fires, each kind is processed only if its own deadline has passed.
 */
export interface RoomDeadlines {
  /** The earliest lobby grace expiry (a dropped player's seat is freed). */
  grace: number | null;
  /** The pause runs out: a bot takes the missing player's seat. */
  pause: number | null;
  /** The turn timer runs out (timeout sounds open). */
  turnTimer: number | null;
  /** The heckling window after a timeout ends: the room moves for the player. */
  turnTimeout: number | null;
  /** ROUND_END moves on by itself. */
  roundAdvance: number | null;
}

export interface RoomDeadlinePolicy {
  turnTimeout: TurnTimeoutPolicy;
  /** False where something else owns round advancing (tournament match rooms). */
  advanceRounds: boolean;
}

export const DEFAULT_DEADLINE_POLICY: RoomDeadlinePolicy = {
  turnTimeout: TURN_TIMEOUT_POLICY,
  advanceRounds: true,
};

function graceDeadline(game: Game): number | null {
  if (game.phase !== GamePhase.LOBBY) return null;
  let earliest: number | null = null;
  for (const state of game.graceStates.values()) {
    const at = state.gracedAt + state.graceDuration;
    if (earliest === null || at < earliest) earliest = at;
  }
  return earliest;
}

function turnTimeoutDeadline(game: Game, policy: TurnTimeoutPolicy): number | null {
  const timer = game.turnTimerState;
  if (policy.mode !== 'auto-act' || !timer?.expired) return null;
  const player = game.getPlayer(timer.playerId);
  return player && !player.isBot ? timer.expiresAt + policy.autoActAfterMs : null;
}

function hasConnectedHumanHost(game: Game): boolean {
  const host = game.getPlayer(game.hostId);
  return Boolean(host && !host.isBot && host.isConnected);
}

function roundAdvanceDeadline(game: Game): number | null {
  if (game.phase !== GamePhase.ROUND_END || game.roundEndedAt === null) return null;
  if (hasConnectedHumanHost(game)) return game.roundEndedAt + ROOM_TIMING.ROUND_END_AUTO_ADVANCE_MS;
  // Counted from when the tables have collected the last trick (a card per seat), so the round's
  // result is shown before the next deal.
  const lastTrickShownAt = game.roundEndedAt + getTrickPresentationMs(game.players.length);
  return lastTrickShownAt + ROOM_TIMING.HOSTLESS_ROUND_END_ADVANCE_MS;
}

export function roomDeadlines(game: Game, policy: RoomDeadlinePolicy = DEFAULT_DEADLINE_POLICY): RoomDeadlines {
  // Nothing but the pause itself runs while the table waits for a reconnect.
  if (game.pauseState) {
    return { grace: null, pause: getPauseDeadline(game.pauseState), turnTimer: null, turnTimeout: null, roundAdvance: null };
  }
  const timer = game.turnTimerState;
  return {
    grace: graceDeadline(game),
    pause: null,
    turnTimer: timer && !timer.expired ? timer.expiresAt : null,
    turnTimeout: turnTimeoutDeadline(game, policy.turnTimeout),
    roundAdvance: policy.advanceRounds ? roundAdvanceDeadline(game) : null,
  };
}

/** The earliest deadline, or null when the room has nothing to wait for. */
export function earliestDeadline(deadlines: RoomDeadlines): number | null {
  const pending = Object.values(deadlines).filter((at): at is number => at !== null);
  return pending.length > 0 ? Math.min(...pending) : null;
}

/** True when the deadline exists and has passed. */
export function isDue(at: number | null, now: number): boolean {
  return at !== null && at <= now;
}
