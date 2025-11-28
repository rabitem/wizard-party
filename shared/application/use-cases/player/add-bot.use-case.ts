import {
  Game,
  Player,
  GamePhase,
  GameEventType,
  InvalidPhaseError,
  NotHostError,
  MaxPlayersReachedError,
  type PlayerJoinedEvent,
} from '../../../domain';

const BOT_NAMES = [
  'WizardBot', 'MagicBot', 'TrickBot', 'CardBot', 'BidBot',
  'JesterBot', 'TrumpBot', 'DealerBot', 'ShuffleBot', 'AceBot',
  'SpellBot', 'MysticBot', 'SorcererBot', 'EnchantBot', 'CharmBot',
];

export interface AddBotInput {
  game: Game;
  playerId: string;
  maxPlayers: number;
  botCounter: number;
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
    const { game, playerId, maxPlayers, botCounter } = input;

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

    // Create bot player
    const botPlayer = new Player(botId, botName, true);
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
