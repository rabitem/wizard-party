import {
  Game,
  GamePhase,
  Suit,
  ALL_SUITS,
} from '../../../domain';

export interface BotTurnInput {
  game: Game;
}

export type BotAction =
  | { type: 'SELECT_TRUMP'; suit: Suit }
  | { type: 'PLACE_BID'; bid: number }
  | { type: 'PLAY_CARD'; cardId: string }
  | { type: 'NONE' };

/**
 * Use case for determining bot actions
 * Returns the action the bot should take based on current game state
 */
export class BotTurnUseCase {
  execute(input: BotTurnInput): BotAction {
    const { game } = input;

    const currentPlayer = game.getCurrentPlayer();
    if (!currentPlayer || !currentPlayer.isBot) {
      return { type: 'NONE' };
    }

    switch (game.phase) {
      case GamePhase.TRUMP_SELECTION:
        return this.selectTrump(game);

      case GamePhase.BIDDING:
        return this.placeBid(game, currentPlayer.id);

      case GamePhase.PLAYING:
        return this.playCard(game, currentPlayer.id);

      default:
        return { type: 'NONE' };
    }
  }

  private selectTrump(game: Game): BotAction {
    const dealer = game.getDealer();
    if (!dealer.isBot) {
      return { type: 'NONE' };
    }

    // Random suit selection
    const randomSuit = ALL_SUITS[Math.floor(Math.random() * ALL_SUITS.length)];
    return { type: 'SELECT_TRUMP', suit: randomSuit };
  }

  private placeBid(game: Game, playerId: string): BotAction {
    const player = game.getPlayer(playerId);
    if (!player) {
      return { type: 'NONE' };
    }

    const maxBid = player.hand.length;
    const forbiddenBid = game.getForbiddenBid();

    // Simple strategy: random bid, avoiding forbidden
    let bid = Math.floor(Math.random() * (maxBid + 1));

    if (bid === forbiddenBid) {
      bid = bid === 0 ? 1 : bid - 1;
      if (bid > maxBid) bid = 0;
    }

    return { type: 'PLACE_BID', bid };
  }

  private playCard(game: Game, playerId: string): BotAction {
    const player = game.getPlayer(playerId);
    if (!player || !game.currentTrick) {
      return { type: 'NONE' };
    }

    const leadSuit = game.currentTrick.getLeadSuit();
    const playableCards = player.getPlayableCards(leadSuit);

    if (playableCards.length === 0) {
      return { type: 'NONE' };
    }

    // Simple strategy: random card
    const randomCard = playableCards[Math.floor(Math.random() * playableCards.length)];
    return { type: 'PLAY_CARD', cardId: randomCard.id };
  }
}
