import { ClientCommandType } from "../../shared/domain";

/**
 * Per-sender command budgets of the game server (token buckets).
 *
 * Each command belongs to one class; each class is a bucket of `burst` tokens that refills at
 * `refillPerSecond`. A command takes one token; with the bucket empty it is refused with
 * RATE_LIMITED. The sender is the seat once a connection joined (so reconnecting does not refill a
 * bucket), the connection before that.
 *
 * The budgets are far above what a person at the table produces (the client already throttles
 * emotes and chat) and exist to stop scripted floods, which otherwise turn into broadcasts to every
 * player and full-state snapshots.
 */
export type CommandRateClass = 'session' | 'liveness' | 'sync' | 'game' | 'lobby' | 'settings' | 'social' | 'sound';

export interface TokenBucketPolicy {
  /** Tokens available at once (and the bucket's size). */
  burst: number;
  /** Tokens added per second, up to `burst`. */
  refillPerSecond: number;
}

export const COMMAND_RATE_LIMITS: Readonly<Record<CommandRateClass, TokenBucketPolicy>> = {
  /** JOIN_GAME: a reconnect loop, not a flood. */
  session: { burst: 5, refillPerSecond: 0.5 },
  /** PING: probes every few seconds at most. */
  liveness: { burst: 10, refillPerSecond: 1 },
  /** REQUEST_STATE: each answer is a full snapshot. */
  sync: { burst: 5, refillPerSecond: 1 },
  /** Bids, cards, trump, effects, rounds: bounded by the game's turn order anyway. */
  game: { burst: 30, refillPerSecond: 5 },
  /** Lobby changes: ready, kicks, host, bots, leaving. */
  lobby: { burst: 20, refillPerSecond: 2 },
  /**
   * Room settings and rules. Last write wins, so a refused update would leave the room on a stale
   * value: the host's controls may send one update per step of a slider drag (the timeout-sound
   * volume has 21 steps), and the budget lets several sweeps through.
   */
  settings: { burst: 60, refillPerSecond: 10 },
  /** Emotes, chat, timeout sounds: each one is broadcast to the table. */
  social: { burst: 8, refillPerSecond: 0.5 },
  /**
   * Sound preference uploads: large frames. The client sends its preferences on connect and after
   * every saved settings change (any setting, not only sounds), and the last one must get through.
   */
  sound: { burst: 10, refillPerSecond: 1 },
};

export const COMMAND_RATE_CLASS: Readonly<Record<ClientCommandType, CommandRateClass>> = {
  [ClientCommandType.JOIN_GAME]: 'session',
  [ClientCommandType.PING]: 'liveness',
  [ClientCommandType.REQUEST_STATE]: 'sync',
  [ClientCommandType.START_GAME]: 'game',
  [ClientCommandType.SELECT_TRUMP]: 'game',
  [ClientCommandType.PLACE_BID]: 'game',
  [ClientCommandType.PLAY_CARD]: 'game',
  [ClientCommandType.RESOLVE_EFFECT]: 'game',
  [ClientCommandType.NEXT_ROUND]: 'game',
  [ClientCommandType.REQUEST_REMATCH]: 'game',
  [ClientCommandType.LEAVE_GAME]: 'lobby',
  [ClientCommandType.SET_ROOM_SETTINGS]: 'settings',
  [ClientCommandType.SET_RULESET]: 'settings',
  [ClientCommandType.SET_READY]: 'lobby',
  [ClientCommandType.KICK_PLAYER]: 'lobby',
  [ClientCommandType.TRANSFER_HOST]: 'lobby',
  [ClientCommandType.ADD_BOT]: 'lobby',
  [ClientCommandType.REMOVE_BOT]: 'lobby',
  [ClientCommandType.SEND_EMOTE]: 'social',
  [ClientCommandType.SEND_CHAT]: 'social',
  [ClientCommandType.PLAY_TIMEOUT_SOUND]: 'social',
  [ClientCommandType.UPDATE_SOUND_PREFERENCES]: 'sound',
};

/** Bounds the limiter's memory if senders are never released (lost close events). */
export const MAX_RATE_LIMITED_SENDERS = 500;
