import {
  Game,
  Card,
  GameEventType,
  NoActiveUndoRequestError,
  type UndoAppliedEvent,
} from '../../../domain';
import { UndoRequestState } from './request-undo.use-case';

export interface ApplyUndoInput {
  game: Game;
  undoRequest: UndoRequestState | null;
}

export interface ApplyUndoOutput {
  undoAppliedEvent: UndoAppliedEvent;
}

/**
 * Use case for applying an approved undo
 * Returns the card to the player's hand and removes it from the trick
 */
export class ApplyUndoUseCase {
  execute(input: ApplyUndoInput): ApplyUndoOutput {
    const { game, undoRequest } = input;

    if (!undoRequest) {
      throw new NoActiveUndoRequestError();
    }

    // Get the player and return the card to their hand
    const player = game.getPlayer(undoRequest.requesterId);
    if (player) {
      const card = Card.fromJSON(undoRequest.card);
      player.hand.push(card);
    }

    // Remove the card from the current trick
    if (game.currentTrick) {
      game.currentTrick.cards.pop();

      // Recalculate lead suit if needed
      if (game.currentTrick.cards.length === 0) {
        game.currentTrick.leadSuit = null;
      } else {
        // Recalculate lead suit from first numbered card
        game.currentTrick.leadSuit = null;
        for (const play of game.currentTrick.cards) {
          const card = Card.fromJSON(play.card);
          if (card.isNumberCard()) {
            game.currentTrick.leadSuit = card.suit;
            break;
          }
        }
      }
    }

    // Restore the player index
    game.currentPlayerIndex = undoRequest.previousPlayerIndex;

    return {
      undoAppliedEvent: {
        type: GameEventType.UNDO_APPLIED,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Check if undo should be applied based on responses
   */
  shouldApplyUndo(undoRequest: UndoRequestState): boolean {
    const approvals = Array.from(undoRequest.responses.values()).filter(Boolean).length;
    return approvals >= undoRequest.requiredApprovals;
  }

  /**
   * Check if undo should be cancelled based on responses
   */
  shouldCancelUndo(undoRequest: UndoRequestState, game: Game): boolean {
    const approvals = Array.from(undoRequest.responses.values()).filter(Boolean).length;
    const denials = Array.from(undoRequest.responses.values()).filter((v) => v === false).length;

    // Check if enough denials to make approval impossible
    const remainingPlayers = game.players.filter(
      (p) => p.id !== undoRequest.requesterId && !undoRequest.responses.has(p.id) && !p.isBot
    ).length;

    return denials > 0 && approvals + remainingPlayers < undoRequest.requiredApprovals;
  }
}
