import {
  DEFAULT_GRACE_DURATION_MS,
  Game,
  GamePhase,
  GameEventType,
  Player,
  type PlayerLeftEvent,
  type GamePausedEvent,
  type PlayerGracedEvent,
} from '../../../domain';

export interface LeaveGameInput {
  game: Game;
  playerId: string;
  /**
   * True when the player chose to leave (LEAVE_GAME); false when their connection dropped. A
   * dropped connection may come back, so the table waits for it; a deliberate leave does not.
   */
  isIntentional?: boolean;
  pauseTimeoutDuration?: number;
  graceTimeoutDuration?: number;
}

export interface LeaveGameOutput {
  playerLeftEvent?: PlayerLeftEvent;
  gamePausedEvent?: GamePausedEvent;
  playerGracedEvent?: PlayerGracedEvent;
  /** The seat is gone (left the lobby): its credentials open nothing any more. */
  wasRemoved: boolean;
  /** A bot took over the seat of a running game; the player can still take it back by rejoining. */
  replacedWithBot: boolean;
  shouldPause: boolean;
  shouldGrace: boolean;
  newHostId?: string;
}

interface LeaveContext {
  game: Game;
  player: Player;
  isIntentional: boolean;
  pauseTimeoutDuration: number;
  graceTimeoutDuration: number;
  now: number;
}

const NOTHING_CHANGED: LeaveGameOutput = {
  wasRemoved: false,
  replacedWithBot: false,
  shouldPause: false,
  shouldGrace: false,
};

function withHost(game: Game, output: Partial<LeaveGameOutput>): LeaveGameOutput {
  const newHostId = game.ensureHost() ?? undefined;
  return { ...NOTHING_CHANGED, ...output, ...(newHostId ? { newHostId } : {}) };
}

/** Lobby: a deliberate leave frees the seat; a dropped connection keeps it for the grace period. */
function leaveLobby(ctx: LeaveContext): LeaveGameOutput {
  const { game, player, isIntentional, graceTimeoutDuration, now } = ctx;

  if (isIntentional) {
    game.removePlayer(player.id);
    return withHost(game, {
      wasRemoved: true,
      playerLeftEvent: { type: GameEventType.PLAYER_LEFT, playerId: player.id, timestamp: now },
    });
  }

  const wasHost = game.hostId === player.id;
  game.gracePlayer(player.id, graceTimeoutDuration);
  return {
    ...NOTHING_CHANGED,
    shouldGrace: true,
    playerGracedEvent: {
      type: GameEventType.PLAYER_GRACED,
      playerId: player.id,
      playerName: player.name,
      graceDuration: graceTimeoutDuration,
      wasHost,
      timestamp: now,
    },
  };
}

/**
 * A running game: a deliberate leave hands the seat to a bot at once (nobody waits for a player
 * who is not coming back); a dropped connection pauses the table for the reconnect window, or
 * joins the queue of disconnected players when the table already waits for someone else.
 */
function leaveRunningGame(ctx: LeaveContext): LeaveGameOutput {
  const { game, player, isIntentional, pauseTimeoutDuration, now } = ctx;

  // A deliberate leave needs a socket mapped to the seat, which the player a pause waits for never
  // has (a rejoin resumes or moves the pause first), so this never leaves a pause on a bot.
  if (isIntentional) {
    game.replaceWithBot(player.id);
    return withHost(game, { replacedWithBot: true });
  }

  player.isConnected = false;
  if (game.isPaused()) return withHost(game, {});

  game.pause(player.id, player.name, pauseTimeoutDuration);
  return withHost(game, {
    shouldPause: true,
    gamePausedEvent: {
      type: GameEventType.GAME_PAUSED,
      pausedForPlayerId: player.id,
      pausedForPlayerName: player.name,
      timeoutDuration: pauseTimeoutDuration,
      reason: 'player_disconnected',
      timestamp: now,
    },
  });
}

/**
 * A player leaves the table, on purpose or because their connection dropped. Every outcome keeps
 * the host a connected human whenever one is seated (Game.ensureHost).
 */
export class LeaveGameUseCase {
  execute(input: LeaveGameInput): LeaveGameOutput {
    const {
      game,
      playerId,
      isIntentional = false,
      pauseTimeoutDuration = DEFAULT_GRACE_DURATION_MS,
      graceTimeoutDuration = DEFAULT_GRACE_DURATION_MS,
    } = input;
    const now = Date.now();

    const player = game.getPlayer(playerId);
    if (!player) {
      return {
        ...NOTHING_CHANGED,
        playerLeftEvent: { type: GameEventType.PLAYER_LEFT, playerId, timestamp: now },
      };
    }

    // A bot holds no connection to lose: a socket of a seat a bot took over that closes late (a
    // second tab, a stale disconnect) neither pauses the table for the bot nor disconnects it.
    if (player.isBot && !isIntentional) return { ...NOTHING_CHANGED };

    const ctx: LeaveContext = { game, player, isIntentional, pauseTimeoutDuration, graceTimeoutDuration, now };
    if (game.phase === GamePhase.LOBBY) return leaveLobby(ctx);
    if (game.isActiveGame()) return leaveRunningGame(ctx);

    // GAME_END: the seat stays for the results screen; a rematch graces it if still gone.
    player.isConnected = false;
    return withHost(game, {});
  }
}
