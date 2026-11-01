import {
  Game,
  GamePhase,
  GameEventType,
  type BidPlacedEvent,
} from '../../../domain';

export interface PlaceBidInput {
  game: Game;
  playerId: string;
  bid: number;
}

export interface PlaceBidOutput {
  bidPlacedEvent: BidPlacedEvent;
  allBidsPlaced: boolean;
}

/**
 * Use case for placing a bid. The game enforces the bidding rules (phase, turn,
 * one whole-number bid in range per round, the hook rule) with typed errors.
 */
export class PlaceBidUseCase {
  execute(input: PlaceBidInput): PlaceBidOutput {
    const { game, playerId, bid } = input;

    game.placeBid(playerId, bid);

    // Read phase after state transition (game.phase may have changed)
    const currentPhase = game.phase as GamePhase;
    const allBidsPlaced = currentPhase === GamePhase.PLAYING;
    const nextPlayer = game.getCurrentPlayer();

    return {
      bidPlacedEvent: {
        type: GameEventType.BID_PLACED,
        playerId,
        bid,
        nextPlayerId: allBidsPlaced ? null : nextPlayer.id,
        timestamp: Date.now(),
      },
      allBidsPlaced,
    };
  }
}
