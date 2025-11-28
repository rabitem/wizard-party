import {
  Game,
  Player,
  GamePhase,
  GameEventType,
  InvalidPhaseError,
  NotHostError,
  type RematchStartedEvent,
} from '../../../domain';

export interface RequestRematchInput {
  game: Game;
  playerId: string;
}

export interface RequestRematchOutput {
  rematchStartedEvent: RematchStartedEvent;
  newGame: Game;
}

/**
 * Use case for requesting a rematch
 * Only host can start rematch, only after game ends
 */
export class RequestRematchUseCase {
  execute(input: RequestRematchInput): RequestRematchOutput {
    const { game, playerId } = input;

    // Validate phase
    if (game.phase !== GamePhase.GAME_END) {
      throw new InvalidPhaseError('GAME_END', game.phase);
    }

    // Validate host
    if (game.hostId !== playerId) {
      throw new NotHostError('start rematch');
    }

    // Create new game with same players
    const players = game.players;
    const newGame = new Game(game.id, game.hostId);

    // Re-add all players (reset scores but keep connections)
    for (const player of players) {
      const newPlayer = new Player(player.id, player.name, player.isBot);
      newPlayer.isConnected = player.isConnected;
      newGame.addPlayer(newPlayer);
    }

    return {
      rematchStartedEvent: {
        type: GameEventType.REMATCH_STARTED,
        timestamp: Date.now(),
      },
      newGame,
    };
  }
}
