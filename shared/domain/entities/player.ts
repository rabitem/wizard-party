import { Card, ICard } from './card';
import { Suit } from '../value-objects/card-types';

/**
 * Round history entry for tracking player performance
 */
export interface RoundHistoryEntry {
  bid: number;
  tricksWon: number;
  score: number;
}

/**
 * Player data transfer object interface
 */
export interface IPlayer {
  readonly id: string;
  name: string;
  hand: ICard[];
  bid: number | null;
  tricksWon: number;
  score: number;
  isConnected: boolean;
  isBot: boolean;
  roundHistory: RoundHistoryEntry[];
}

/**
 * Player entity representing a participant in the game
 */
export class Player implements IPlayer {
  public hand: Card[] = [];
  public bid: number | null = null;
  public tricksWon: number = 0;
  public score: number = 0;
  public isConnected: boolean = true;
  public isBot: boolean = false;
  public roundHistory: RoundHistoryEntry[] = [];

  constructor(
    public readonly id: string,
    public name: string,
    isBot: boolean = false
  ) {
    this.isBot = isBot;
  }

  /**
   * Add cards to player's hand
   */
  receiveCards(cards: Card[]): void {
    this.hand.push(...cards);
  }

  /**
   * Check if player has a specific card
   */
  hasCard(cardId: string): boolean {
    return this.hand.some((card) => card.id === cardId);
  }

  /**
   * Play a card from hand (removes and returns it)
   */
  playCard(cardId: string): Card {
    const index = this.hand.findIndex((card) => card.id === cardId);
    if (index === -1) {
      throw new Error(`Player does not have card: ${cardId}`);
    }
    return this.hand.splice(index, 1)[0];
  }

  /**
   * Check if player can follow the lead suit
   */
  canFollowSuit(leadSuit: Suit): boolean {
    return this.hand.some(
      (card) => card.isNumberCard() && card.suit === leadSuit
    );
  }

  /**
   * Get cards that are legal to play given the lead suit
   *
   * Rules:
   * - If no lead suit, all cards are playable
   * - If can follow suit, must play suit card OR Wizard/Jester
   * - If cannot follow suit, all cards are playable
   */
  getPlayableCards(leadSuit: Suit | null): Card[] {
    // If no lead suit, or lead was wizard/jester, all cards are playable
    if (leadSuit === null) {
      return [...this.hand];
    }

    // Check if player can follow suit
    const canFollow = this.canFollowSuit(leadSuit);

    if (!canFollow) {
      // Can't follow suit - all cards are playable
      return [...this.hand];
    }

    // Must follow suit OR play wizard/jester
    return this.hand.filter(
      (card) =>
        card.isWizard() ||
        card.isJester() ||
        (card.isNumberCard() && card.suit === leadSuit)
    );
  }

  /**
   * Place a bid for the current round
   */
  placeBid(bid: number): void {
    if (bid < 0 || bid > this.hand.length) {
      throw new Error(`Invalid bid: ${bid}. Must be between 0 and ${this.hand.length}`);
    }
    this.bid = bid;
  }

  /**
   * Record winning a trick
   */
  winTrick(): void {
    this.tricksWon++;
  }

  /**
   * Calculate score for the current round
   *
   * Scoring:
   * - Exact bid: 20 points + 10 per trick won
   * - Missed bid: -10 per trick off
   */
  calculateRoundScore(): number {
    if (this.bid === null) {
      throw new Error('Cannot calculate score without a bid');
    }

    if (this.tricksWon === this.bid) {
      // Made exact bid: 20 points + 10 per trick
      return 20 + this.tricksWon * 10;
    } else {
      // Missed bid: -10 per trick off
      return -Math.abs(this.tricksWon - this.bid) * 10;
    }
  }

  /**
   * Apply round score and record history
   */
  applyRoundScore(): void {
    const roundScore = this.calculateRoundScore();
    this.score += roundScore;

    // Record round history
    if (this.bid !== null) {
      this.roundHistory.push({
        bid: this.bid,
        tricksWon: this.tricksWon,
        score: roundScore,
      });
    }
  }

  /**
   * Reset player state for a new round
   */
  resetForNewRound(): void {
    this.hand = [];
    this.bid = null;
    this.tricksWon = 0;
  }

  /**
   * Serialize to plain object
   */
  toJSON(): IPlayer {
    return {
      id: this.id,
      name: this.name,
      hand: this.hand.map((card) => card.toJSON()),
      bid: this.bid,
      tricksWon: this.tricksWon,
      score: this.score,
      isConnected: this.isConnected,
      isBot: this.isBot,
      roundHistory: this.roundHistory,
    };
  }

  /**
   * Deserialize from plain object
   */
  static fromJSON(data: IPlayer): Player {
    const player = new Player(data.id, data.name, data.isBot);
    player.hand = data.hand.map((cardData) => Card.fromJSON(cardData));
    player.bid = data.bid;
    player.tricksWon = data.tricksWon;
    player.score = data.score;
    player.isConnected = data.isConnected;
    player.roundHistory = data.roundHistory || [];
    return player;
  }
}
