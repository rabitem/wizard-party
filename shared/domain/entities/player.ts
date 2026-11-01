import { Card, ICard } from './card';
import { Suit } from '../value-objects/card-types';
import {
  DEFAULT_SCORING_RULES,
  type IScoringRules,
} from '../value-objects/ruleset-config';
import {
  canFollowSuit as handCanFollowSuit,
  legalPlays,
} from '../expansions/card-rules';
import type { TrickLead } from '../expansions/trick-lead';
import { isBidInRange, scoreRound } from '../expansions/round-rules';
import { BidAlreadyPlacedError, InvalidBidError } from '../errors/game-errors';
import { parseBotDifficulty, type BotDifficultyLevel } from '../value-objects/bot-difficulty';

/**
 * Round history entry for tracking player performance
 */
export interface RoundHistoryEntry {
  /** Final bid, including Cloud adjustments. */
  bid: number;
  tricksWon: number;
  score: number;
  /** Net change to the bid made by Cloud cards (omitted when zero). */
  bidAdjustment?: number;
}

/**
 * Player data transfer object interface
 */
export interface IPlayer {
  readonly id: string;
  name: string;
  hand: ICard[];
  bid: number | null;
  /** Net change to this round's bid made by Cloud cards. */
  bidAdjustment?: number;
  tricksWon: number;
  score: number;
  isConnected: boolean;
  isBot: boolean;
  botDifficulty?: BotDifficultyLevel; // 1=Novice, 2=Easy, 3=Medium, 4=Hard, 5=Expert
  roundHistory: RoundHistoryEntry[];
  /** Lobby ready flag. Bots are always ready; only meaningful in the LOBBY phase. */
  isReady?: boolean;
}

/**
 * Player entity representing a participant in the game
 */
export class Player implements IPlayer {
  private static readonly MAX_NAME_LENGTH = 20;
  /** Name a bot that took over a human seat plays under: "Bot <name>". */
  static readonly BOT_TAKEOVER_PREFIX = 'Bot ';

  private _name: string = '';
  public hand: Card[] = [];
  public bid: number | null = null;
  public bidAdjustment: number = 0;
  public tricksWon: number = 0;
  public score: number = 0;
  public isConnected: boolean = true;
  public isBot: boolean = false;
  public botDifficulty?: BotDifficultyLevel;
  public roundHistory: RoundHistoryEntry[] = [];
  private _isReady: boolean = false;

  constructor(
    public readonly id: string,
    name: string,
    isBot: boolean = false,
    botDifficulty?: unknown
  ) {
    this.name = name;
    this.isBot = isBot;
    // Bots always have a valid difficulty; humans never carry one.
    this.botDifficulty = isBot ? parseBotDifficulty(botDifficulty) : undefined;
  }

  /** Bots are always ready; humans start not ready and toggle it in the lobby. */
  get isReady(): boolean {
    return this.isBot || this._isReady;
  }

  set isReady(value: boolean) {
    this._isReady = value;
  }

  /**
   * A bot takes over this human seat (hand, bid, tricks and score stay). It plays at the default
   * level and is always connected.
   */
  handOverToBot(): void {
    if (this.isBot) return;
    this.name = `${Player.BOT_TAKEOVER_PREFIX}${this.name}`;
    this.isBot = true;
    this.botDifficulty = parseBotDifficulty(undefined);
    this.isConnected = true;
  }

  /** The seat's human is back (also after a bot held the seat): connected, under their name. */
  reclaimByHuman(name: string): void {
    this.name = name;
    this.isBot = false;
    this.botDifficulty = undefined;
    this.isConnected = true;
  }

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._name =
      value.length <= Player.MAX_NAME_LENGTH
        ? value
        : `${value.slice(0, Player.MAX_NAME_LENGTH - 1)  }…`;
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
   * Remove a card from hand without playing it (passing, swapping)
   */
  takeCard(cardId: string): Card {
    return this.playCard(cardId);
  }

  /**
   * Check if player can follow the lead suit (only number cards oblige)
   */
  canFollowSuit(leadSuit: Suit): boolean {
    return handCanFollowSuit(this.hand, leadSuit);
  }

  /**
   * Cards that are legal to play into a trick with this lead (the single rule in
   * expansions/card-rules.ts)
   */
  getLegalPlays(lead: TrickLead): Card[] {
    return legalPlays(this.hand, lead);
  }

  /**
   * Place a bid for the current round: a whole number of tricks between 0 and
   * the hand size, once per round.
   */
  placeBid(bid: number): void {
    if (this.bid !== null) {
      throw new BidAlreadyPlacedError();
    }
    if (!isBidInRange(bid, this.hand.length)) {
      throw new InvalidBidError(bid, this.hand.length);
    }
    this.bid = bid;
  }

  /**
   * Change the bid by one (Cloud). Returns the new bid.
   */
  adjustBid(delta: 1 | -1): number {
    if (this.bid === null) {
      throw new Error('Cannot adjust a bid that was not placed');
    }
    if (this.bid + delta < 0) {
      throw new Error('Bid cannot go below zero');
    }
    this.bid += delta;
    this.bidAdjustment += delta;
    return this.bid;
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
  calculateRoundScore(scoringRules: IScoringRules = DEFAULT_SCORING_RULES): number {
    if (this.bid === null) {
      throw new Error('Cannot calculate score without a bid');
    }

    return scoreRound(this.bid, this.tricksWon, scoringRules);
  }

  /**
   * Apply round score and record history
   */
  applyRoundScore(scoringRules: IScoringRules = DEFAULT_SCORING_RULES): void {
    const roundScore = this.calculateRoundScore(scoringRules);
    this.score += roundScore;

    // Record round history
    if (this.bid !== null) {
      this.roundHistory.push({
        bid: this.bid,
        tricksWon: this.tricksWon,
        score: roundScore,
        ...(this.bidAdjustment !== 0 ? { bidAdjustment: this.bidAdjustment } : {}),
      });
    }
  }

  /**
   * Reset player state for a new round
   */
  resetForNewRound(): void {
    this.hand = [];
    this.bid = null;
    this.bidAdjustment = 0;
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
      ...(this.bidAdjustment !== 0 ? { bidAdjustment: this.bidAdjustment } : {}),
      tricksWon: this.tricksWon,
      score: this.score,
      isConnected: this.isConnected,
      isBot: this.isBot,
      botDifficulty: this.botDifficulty,
      roundHistory: this.roundHistory.map((entry) => ({ ...entry })),
      isReady: this.isReady,
    };
  }

  /**
   * Deserialize from plain object
   */
  static fromJSON(data: IPlayer): Player {
    const player = new Player(data.id, data.name, data.isBot, data.botDifficulty);
    player.hand = data.hand.map((cardData) => Card.fromJSON(cardData));
    player.bid = data.bid;
    player.bidAdjustment = data.bidAdjustment ?? 0;
    player.tricksWon = data.tricksWon;
    player.score = data.score;
    player.isConnected = data.isConnected;
    player.roundHistory = (data.roundHistory ?? []).map((entry) => ({ ...entry }));
    player.isReady = data.isReady ?? false;
    return player;
  }
}
