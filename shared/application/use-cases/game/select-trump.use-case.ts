import {
  Game,
  Suit,
  GameEventType,
  InvalidPhaseError,
  NotDealerError,
  GamePhase,
  type TrumpSelectedEvent,
} from '../../../domain';

export interface SelectTrumpInput {
  game: Game;
  playerId: string;
  suit: Suit;
}

export interface SelectTrumpOutput {
  trumpSelectedEvent: TrumpSelectedEvent;
}

/**
 * Use case for selecting trump suit when a Wizard is revealed
 * Only the dealer can select trump
 */
export class SelectTrumpUseCase {
  execute(input: SelectTrumpInput): SelectTrumpOutput {
    const { game, playerId, suit } = input;

    // Validate phase
    if (game.phase !== GamePhase.TRUMP_SELECTION) {
      throw new InvalidPhaseError('TRUMP_SELECTION', game.phase);
    }

    // Validate dealer
    if (game.getDealer().id !== playerId) {
      throw new NotDealerError();
    }

    // Select trump
    game.selectTrump(playerId, suit);

    return {
      trumpSelectedEvent: {
        type: GameEventType.TRUMP_SELECTED,
        trumpSuit: suit,
        timestamp: Date.now(),
      },
    };
  }
}
