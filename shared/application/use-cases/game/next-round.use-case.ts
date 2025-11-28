import {
  Game,
  GamePhase,
  GameEventType,
  InvalidPhaseError,
  NotHostError,
  type TrumpRevealedEvent,
} from '../../../domain';

export interface NextRoundInput {
  game: Game;
  playerId: string;
}

export interface NextRoundOutput {
  trumpRevealedEvent: TrumpRevealedEvent;
}

/**
 * Use case for starting the next round
 * Only host can start next round
 */
export class NextRoundUseCase {
  execute(input: NextRoundInput): NextRoundOutput {
    const { game, playerId } = input;

    // Validate phase
    if (game.phase !== GamePhase.ROUND_END) {
      throw new InvalidPhaseError('ROUND_END', game.phase);
    }

    // Validate host
    if (game.hostId !== playerId) {
      throw new NotHostError('start next round');
    }

    // Start next round
    game.startNextRound();

    // Read phase after state transition (game.phase may have changed)
    const currentPhase = game.phase as GamePhase;

    return {
      trumpRevealedEvent: {
        type: GameEventType.TRUMP_REVEALED,
        trumpCard: game.trumpCard?.toJSON() ?? null,
        trumpSuit: game.trumpSuit,
        dealerMustChoose: currentPhase === GamePhase.TRUMP_SELECTION,
        timestamp: Date.now(),
      },
    };
  }
}
