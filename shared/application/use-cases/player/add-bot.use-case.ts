import {
  Game,
  Player,
  GamePhase,
  GameEventType,
  InvalidPhaseError,
  NotHostError,
  MaxPlayersReachedError,
  BOT_NAMES,
  type PlayerJoinedEvent,
} from '../../../domain';

export interface AddBotInput {
  game: Game;
  playerId: string;
  maxPlayers: number;
  botCounter: number;
  difficulty?: 1 | 2 | 3 | 4 | 5; // 1=Novice to 5=Expert, defaults to 3 (Medium)
}

export interface AddBotOutput {
  playerJoinedEvent: PlayerJoinedEvent;
  botId: string;
  botName: string;
  newBotCounter: number;
}

/**
 * Use case for adding a bot to the game
 * Only host can add bots, only in lobby
 */
export class AddBotUseCase {
  execute(input: AddBotInput): AddBotOutput {
    const { game, playerId, maxPlayers, botCounter, difficulty = 3 } = input;

    // Validate host
    if (game.hostId !== playerId) {
      throw new NotHostError('add bots');
    }

    // Validate phase
    if (game.phase !== GamePhase.LOBBY) {
      throw new InvalidPhaseError('LOBBY', game.phase);
    }

    // Validate player count
    if (game.players.length >= maxPlayers) {
      throw new MaxPlayersReachedError(maxPlayers);
    }

    // Generate bot
    const newBotCounter = botCounter + 1;
    const botId = `bot-${newBotCounter}-${Date.now()}`;
    const botName = BOT_NAMES[newBotCounter % BOT_NAMES.length];

    // Create bot player with difficulty
    const botPlayer = new Player(botId, botName, true, difficulty);
    game.addPlayer(botPlayer);

    return {
      playerJoinedEvent: {
        type: GameEventType.PLAYER_JOINED,
        playerId: botId,
        playerName: botName,
        isBot: true,
        timestamp: Date.now(),
      },
      botId,
      botName,
      newBotCounter,
    };
  }
}
