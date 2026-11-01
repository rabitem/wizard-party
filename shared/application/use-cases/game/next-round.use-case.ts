import { buildTrumpRevealedEvent } from './game-event-factory';
import {
  Game,
  GamePhase,
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
 * Use case for starting the next round: the host moves the table on, and the room does it by
 * itself once the round-end wait runs out (so an idle host cannot hold everyone).
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

    return {
      trumpRevealedEvent: buildTrumpRevealedEvent(game, Date.now()),
    };
  }

  /**
   * The room advances ROUND_END on its own (the wait ran out). Null when there is nothing to
   * advance: another phase, or a paused table.
   */
  executeOnTimeout(input: Pick<NextRoundInput, 'game'>): NextRoundOutput | null {
    const { game } = input;
    if (game.phase !== GamePhase.ROUND_END || game.isPaused()) return null;
    game.startNextRound();
    return { trumpRevealedEvent: buildTrumpRevealedEvent(game, Date.now()) };
  }
}
