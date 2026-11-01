import {
  Game,
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
 * The host starts the next game at the same table once a game is over. The aggregate decides
 * what carries over (Game.createRematch): rules, bot levels, host, bans and seats; a human who is
 * not connected gets the lobby grace period instead of blocking the new lobby.
 */
export class RequestRematchUseCase {
  execute(input: RequestRematchInput): RequestRematchOutput {
    const { game, playerId } = input;

    if (game.phase !== GamePhase.GAME_END) {
      throw new InvalidPhaseError('GAME_END', game.phase);
    }
    if (game.hostId !== playerId) {
      throw new NotHostError('start rematch');
    }

    return {
      rematchStartedEvent: {
        type: GameEventType.REMATCH_STARTED,
        timestamp: Date.now(),
      },
      newGame: game.createRematch(),
    };
  }
}
