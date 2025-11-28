import {
  Game,
  Card,
  GamePhase,
  GameEventType,
  InvalidPhaseError,
  UndoNotAvailableError,
  UndoAlreadyPendingError,
  type UndoRequestedEvent,
  type ICard,
} from '../../../domain';

export interface LastPlayedCard {
  playerId: string;
  card: Card;
  previousPlayerIndex: number;
}

export interface UndoRequestState {
  requesterId: string;
  requesterName: string;
  cardId: string;
  card: ICard;
  previousPlayerIndex: number;
  timestamp: number;
  responses: Map<string, boolean>;
  requiredApprovals: number;
  timeoutId: ReturnType<typeof setTimeout> | null;
}

export interface RequestUndoInput {
  game: Game;
  playerId: string;
  lastPlayedCard: LastPlayedCard | null;
  currentUndoRequest: UndoRequestState | null;
}

export interface RequestUndoOutput {
  undoRequestedEvent: UndoRequestedEvent;
  undoRequestState: UndoRequestState;
  botAutoApprovals: { playerId: string; playerName: string; approved: boolean }[];
}

const SUIT_SYMBOLS: Record<string, string> = {
  GIANTS: '⛰',
  ELVES: '✦',
  DWARVES: '⚒',
  HUMANS: '⚔',
};

/**
 * Use case for requesting an undo of the last played card
 */
export class RequestUndoUseCase {
  execute(input: RequestUndoInput): RequestUndoOutput {
    const { game, playerId, lastPlayedCard, currentUndoRequest } = input;

    // Validate phase
    if (game.phase !== GamePhase.PLAYING) {
      throw new InvalidPhaseError('PLAYING', game.phase);
    }

    // Validate last played card exists and belongs to requester
    if (!lastPlayedCard || lastPlayedCard.playerId !== playerId) {
      throw new UndoNotAvailableError();
    }

    // Check for existing undo request
    if (currentUndoRequest) {
      throw new UndoAlreadyPendingError();
    }

    const player = game.getPlayer(playerId);
    if (!player) {
      throw new UndoNotAvailableError();
    }

    // Calculate required approvals (all other human players)
    const otherHumanPlayers = game.players.filter(
      (p) => p.id !== playerId && !p.isBot && p.isConnected
    );
    const requiredApprovals = Math.max(1, otherHumanPlayers.length);

    // Generate card description
    const cardDescription = this.getCardDescription(lastPlayedCard.card);

    const timestamp = Date.now();

    // Create undo request state
    const undoRequestState: UndoRequestState = {
      requesterId: playerId,
      requesterName: player.name,
      cardId: lastPlayedCard.card.id,
      card: lastPlayedCard.card.toJSON(),
      previousPlayerIndex: lastPlayedCard.previousPlayerIndex,
      timestamp,
      responses: new Map(),
      requiredApprovals,
      timeoutId: null,
    };

    // Calculate bot auto-approvals (70% chance to approve)
    const botAutoApprovals: { playerId: string; playerName: string; approved: boolean }[] = [];
    for (const p of game.players) {
      if (p.isBot && p.id !== playerId) {
        const approved = Math.random() > 0.3;
        undoRequestState.responses.set(p.id, approved);
        botAutoApprovals.push({
          playerId: p.id,
          playerName: p.name,
          approved,
        });
      }
    }

    return {
      undoRequestedEvent: {
        type: GameEventType.UNDO_REQUESTED,
        requesterId: playerId,
        requesterName: player.name,
        cardId: lastPlayedCard.card.id,
        cardDescription,
        requiredApprovals,
        timestamp,
      },
      undoRequestState,
      botAutoApprovals,
    };
  }

  private getCardDescription(card: Card): string {
    if (card.isWizard()) {
      return 'Wizard';
    }
    if (card.isJester()) {
      return 'Jester';
    }
    return `${card.value} ${SUIT_SYMBOLS[card.suit!] || card.suit}`;
  }
}
