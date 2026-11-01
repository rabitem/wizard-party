import {
  Game,
  GameEventType,
  type GameResumedEvent,
  type PlayerJoinedEvent,
} from '../../../domain';

export interface ResumeGameInput {
  game: Game;
  reconnectedPlayerId?: string; // if player reconnected
  botCounter?: number; // for generating bot names
}

export interface ResumeGameOutput {
  gameResumedEvent?: GameResumedEvent;
  playerJoinedEvent?: PlayerJoinedEvent; // if bot replaced the player
  newBotCounter?: number;
  wasResumed: boolean;
  replacedWithBot: boolean;
  /** Set when a bot took the host's seat and the host moved to a connected human. */
  newHostId?: string;
}

/**
 * Use case for resuming a paused game
 * - On reconnect: resume game with the returning player
 * - On timeout: replace disconnected player with bot and resume
 */
export class ResumeGameUseCase {
  /**
   * Resume game when a player reconnects
   */
  executeOnReconnect(input: ResumeGameInput): ResumeGameOutput {
    const { game, reconnectedPlayerId } = input;

    if (!game.pauseState) {
      return { wasResumed: false, replacedWithBot: false };
    }

    // Verify this is the player we're waiting for
    if (reconnectedPlayerId !== game.pauseState.pausedForPlayerId) {
      return { wasResumed: false, replacedWithBot: false };
    }

    const player = game.getPlayer(reconnectedPlayerId);
    if (!player) {
      return { wasResumed: false, replacedWithBot: false };
    }

    // Mark player as connected again
    player.isConnected = true;

    const playerName = player.name;

    // Resume the game
    game.resume();

    return {
      gameResumedEvent: {
        type: GameEventType.GAME_RESUMED,
        resumedPlayerId: reconnectedPlayerId,
        resumedPlayerName: playerName,
        timestamp: Date.now(),
      },
      wasResumed: true,
      replacedWithBot: false,
    };
  }

  /**
   * The pause ran out: a bot takes the missing player's seat and the game resumes. Does nothing
   * before the pause is due, whoever calls it (an early or stale alarm cannot take a seat).
   */
  executeOnTimeout(input: ResumeGameInput): ResumeGameOutput {
    const { game, botCounter = 0 } = input;

    if (!game.pauseState || !game.isPauseTimedOut()) {
      return { wasResumed: false, replacedWithBot: false };
    }

    const pausedPlayerId = game.pauseState.pausedForPlayerId;
    if (!game.getPlayer(pausedPlayerId)) {
      // Player doesn't exist anymore, just resume
      game.resume();
      return { wasResumed: true, replacedWithBot: false };
    }

    const seat = game.replaceWithBot(pausedPlayerId);
    game.resume();
    const newHostId = game.ensureHost() ?? undefined;

    return {
      gameResumedEvent: {
        type: GameEventType.GAME_RESUMED,
        resumedPlayerId: pausedPlayerId,
        resumedPlayerName: seat.name,
        timestamp: Date.now(),
      },
      wasResumed: true,
      replacedWithBot: true,
      newBotCounter: botCounter + 1,
      ...(newHostId ? { newHostId } : {}),
    };
  }
}
