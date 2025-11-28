import {
  Game,
  GamePhase,
  GameEventType,
  NotHostError,
  NotEnoughPlayersError,
  type GameStartedEvent,
  type TrumpRevealedEvent,
} from '../../../domain';

export interface StartGameInput {
  game: Game;
  playerId: string;
}

export interface StartGameOutput {
  gameStartedEvent: GameStartedEvent;
  trumpRevealedEvent: TrumpRevealedEvent;
}

/**
 * Use case for starting a game
 * Only the host can start, requires 3-6 players
 */
export class StartGameUseCase {
  execute(input: StartGameInput): StartGameOutput {
    const { game, playerId } = input;

    // Validate host
    if (game.hostId !== playerId) {
      throw new NotHostError('start the game');
    }

    // Validate player count
    if (!game.canStart()) {
      throw new NotEnoughPlayersError(3, game.players.length);
    }

    // Start the game
    game.start();

    const timestamp = Date.now();

    return {
      gameStartedEvent: {
        type: GameEventType.GAME_STARTED,
        state: game.toJSON(),
        timestamp,
      },
      trumpRevealedEvent: {
        type: GameEventType.TRUMP_REVEALED,
        trumpCard: game.trumpCard?.toJSON() ?? null,
        trumpSuit: game.trumpSuit,
        dealerMustChoose: game.phase === GamePhase.TRUMP_SELECTION,
        timestamp,
      },
    };
  }
}
