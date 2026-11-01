import {
  Game,
  Suit,
  GameEventType,
  type TrumpSelectedEvent,
} from '../../../domain';

export interface SelectTrumpInput {
  game: Game;
  playerId: string;
  /** Null declares no trump (Werewolf holder only). */
  suit: Suit | null;
}

export interface SelectTrumpOutput {
  trumpSelectedEvent: TrumpSelectedEvent;
}

/**
 * Use case for selecting trump: by the dealer when a Wizard (or another
 * dealer-chooses card) is turned up, or by the Werewolf holder after the swap
 */
export class SelectTrumpUseCase {
  execute(input: SelectTrumpInput): SelectTrumpOutput {
    const { game, playerId, suit } = input;

    // The game checks phase, chooser and the suit itself (null only where the
    // choice allows no trump) with typed errors.
    game.selectTrump(playerId, suit);

    return {
      trumpSelectedEvent: {
        type: GameEventType.TRUMP_SELECTED,
        trumpSuit: suit,
        playerId,
        timestamp: Date.now(),
      },
    };
  }
}
