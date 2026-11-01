import {
  Game,
  GamePhase,
  GameEventType,
  InvalidPhaseError,
  NotHostError,
  PlayerNotFoundError,
  type PlayerLeftEvent,
} from '../../../domain';

export interface RemoveBotInput {
  game: Game;
  playerId: string;
  botId: string;
}

export interface RemoveBotOutput {
  playerLeftEvent: PlayerLeftEvent;
}

/**
 * Use case for removing a bot from the game
 * Only host can remove bots, only in lobby
 */
export class RemoveBotUseCase {
  execute(input: RemoveBotInput): RemoveBotOutput {
    const { game, playerId, botId } = input;

    // Validate host
    if (game.hostId !== playerId) {
      throw new NotHostError('remove bots');
    }

    // Validate phase
    if (game.phase !== GamePhase.LOBBY) {
      throw new InvalidPhaseError('LOBBY', game.phase);
    }

    // Validate bot exists
    const bot = game.getPlayer(botId);
    if (!bot || !bot.isBot) {
      throw new PlayerNotFoundError(botId);
    }

    // Remove bot
    game.removePlayer(botId);

    return {
      playerLeftEvent: {
        type: GameEventType.PLAYER_LEFT,
        playerId: botId,
        timestamp: Date.now(),
      },
    };
  }
}
