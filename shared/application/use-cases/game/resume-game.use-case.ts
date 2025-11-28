import {
  Game,
  GamePhase,
  GameEventType,
  Player,
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

    if (game.phase !== GamePhase.PAUSED || !game.pauseState) {
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
   * Resume game by replacing disconnected player with a bot (on timeout)
   */
  executeOnTimeout(input: ResumeGameInput): ResumeGameOutput {
    const { game, botCounter = 0 } = input;

    if (game.phase !== GamePhase.PAUSED || !game.pauseState) {
      return { wasResumed: false, replacedWithBot: false };
    }

    const pausedPlayerId = game.pauseState.pausedForPlayerId;
    const player = game.getPlayer(pausedPlayerId);

    if (!player) {
      // Player doesn't exist anymore, just resume
      game.resume();
      return { wasResumed: true, replacedWithBot: false };
    }

    // Convert the player to a bot
    const botName = `Bot ${player.name}`;
    player.name = botName;
    player.isBot = true;
    player.isConnected = true; // Bots are always "connected"

    // Resume the game
    game.resume();

    return {
      gameResumedEvent: {
        type: GameEventType.GAME_RESUMED,
        resumedPlayerId: pausedPlayerId,
        resumedPlayerName: botName,
        timestamp: Date.now(),
      },
      wasResumed: true,
      replacedWithBot: true,
      newBotCounter: botCounter + 1,
    };
  }
}
