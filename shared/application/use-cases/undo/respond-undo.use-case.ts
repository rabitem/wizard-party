import {
  Game,
  GameEventType,
  PlayerNotFoundError,
  NoActiveUndoRequestError,
  type UndoResponseEvent,
} from '../../../domain';
import { UndoRequestState } from './request-undo.use-case';

export interface RespondUndoInput {
  game: Game;
  playerId: string;
  approved: boolean;
  undoRequest: UndoRequestState | null;
}

export interface RespondUndoOutput {
  undoResponseEvent: UndoResponseEvent;
  updatedUndoRequest: UndoRequestState;
}

/**
 * Use case for responding to an undo request
 */
export class RespondUndoUseCase {
  execute(input: RespondUndoInput): RespondUndoOutput {
    const { game, playerId, approved, undoRequest } = input;

    if (!undoRequest) {
      throw new NoActiveUndoRequestError();
    }

    const player = game.getPlayer(playerId);
    if (!player) {
      throw new PlayerNotFoundError(playerId);
    }

    // Can't respond to your own request
    if (undoRequest.requesterId === playerId) {
      throw new Error('Cannot respond to your own undo request');
    }

    // Can't respond twice
    if (undoRequest.responses.has(playerId)) {
      throw new Error('Already responded to this request');
    }

    // Record response
    undoRequest.responses.set(playerId, approved);

    return {
      undoResponseEvent: {
        type: GameEventType.UNDO_RESPONSE,
        responderId: playerId,
        responderName: player.name,
        approved,
        timestamp: Date.now(),
      },
      updatedUndoRequest: undoRequest,
    };
  }
}
