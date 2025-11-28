import { Card, ICard } from './card';
import { Suit } from '../value-objects/card-types';

/**
 * Represents a card played in a trick with player attribution
 */
export interface PlayedCard {
  playerId: string;
  card: ICard;
}

/**
 * Trick data transfer object interface
 */
export interface ITrick {
  cards: PlayedCard[];
  leadSuit: Suit | null;
  winnerId: string | null;
}

/**
 * Trick entity representing a single trick (one card from each player)
 *
 * The lead suit is determined by the first number card played.
 * Wizards and Jesters do not set the lead suit.
 */
export class Trick implements ITrick {
  public cards: PlayedCard[] = [];
  public leadSuit: Suit | null = null;
  public winnerId: string | null = null;

  constructor(private readonly trumpSuit: Suit | null) {}

  /**
   * Play a card into this trick
   */
  playCard(playerId: string, card: Card): void {
    // Determine lead suit from first number card played
    if (this.leadSuit === null && card.isNumberCard()) {
      this.leadSuit = card.suit;
    }

    this.cards.push({ playerId, card: card.toJSON() });
  }

  /**
   * Check if all players have played
   */
  isComplete(playerCount: number): boolean {
    return this.cards.length === playerCount;
  }

  /**
   * Determine the winner of this trick
   * Returns the winning player's ID
   */
  determineWinner(): string {
    if (this.cards.length === 0) {
      throw new Error('Cannot determine winner of empty trick');
    }

    let winningPlay = this.cards[0];
    let winningCard = Card.fromJSON(winningPlay.card);

    for (let i = 1; i < this.cards.length; i++) {
      const currentPlay = this.cards[i];
      const currentCard = Card.fromJSON(currentPlay.card);

      if (currentCard.beats(winningCard, this.leadSuit, this.trumpSuit)) {
        winningPlay = currentPlay;
        winningCard = currentCard;
      }
    }

    this.winnerId = winningPlay.playerId;
    return this.winnerId;
  }

  /**
   * Get the lead suit for this trick
   */
  getLeadSuit(): Suit | null {
    return this.leadSuit;
  }

  /**
   * Get the trump suit for this trick
   */
  getTrumpSuit(): Suit | null {
    return this.trumpSuit;
  }

  /**
   * Serialize to plain object
   */
  toJSON(): ITrick {
    return {
      cards: this.cards,
      leadSuit: this.leadSuit,
      winnerId: this.winnerId,
    };
  }

  /**
   * Deserialize from plain object
   */
  static fromJSON(data: ITrick, trumpSuit: Suit | null): Trick {
    const trick = new Trick(trumpSuit);
    trick.cards = data.cards;
    trick.leadSuit = data.leadSuit;
    trick.winnerId = data.winnerId;
    return trick;
  }
}
