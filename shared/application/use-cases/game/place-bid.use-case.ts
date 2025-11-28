import {
  Game,
  GamePhase,
  GameEventType,
  InvalidPhaseError,
  NotYourTurnError,
  PlayerNotFoundError,
  InvalidBidError,
  ForbiddenBidError,
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
 * Use case for placing a bid
 * Enforces forbidden bid rule for last bidder
 */
export class PlaceBidUseCase {
  execute(input: PlaceBidInput): PlaceBidOutput {
    const { game, playerId, bid } = input;

    // Validate phase
    if (game.phase !== GamePhase.BIDDING) {
      throw new InvalidPhaseError('BIDDING', game.phase);
    }

    // Validate player exists
    const player = game.getPlayer(playerId);
    if (!player) {
      throw new PlayerNotFoundError(playerId);
    }

    // Validate turn
    if (game.getCurrentPlayer().id !== playerId) {
      throw new NotYourTurnError('bid');
    }

    // Validate bid range
    if (bid < 0 || bid > player.hand.length) {
      throw new InvalidBidError(bid, player.hand.length);
    }

    // Check forbidden bid (last bidder)
    const forbiddenBid = game.getForbiddenBid();
    if (forbiddenBid !== null && bid === forbiddenBid) {
      throw new ForbiddenBidError(forbiddenBid, game.currentRound);
    }

    // Place bid
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
