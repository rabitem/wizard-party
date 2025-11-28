import { Card, ICard } from './card';
import { Deck } from './deck';
import { Player, IPlayer } from './player';
import { Trick, ITrick } from './trick';
import { Suit } from '../value-objects/card-types';

/**
 * Game phase enumeration
 */
export enum GamePhase {
  LOBBY = 'LOBBY',
  DEALING = 'DEALING',
  TRUMP_SELECTION = 'TRUMP_SELECTION',
  BIDDING = 'BIDDING',
  PLAYING = 'PLAYING',
  ROUND_END = 'ROUND_END',
  GAME_END = 'GAME_END',
}

/**
 * Room settings for multiplayer configuration
 */
export interface IRoomSettings {
  name: string;
  isPublic: boolean;
  maxPlayers: number;
  password?: string;
}

/**
 * Game state data transfer object interface
 */
export interface IGameState {
  id: string;
  phase: GamePhase;
  players: IPlayer[];
  currentRound: number;
  maxRounds: number;
  trumpSuit: Suit | null;
  trumpCard: ICard | null;
  currentPlayerIndex: number;
  dealerIndex: number;
  currentTrick: ITrick | null;
  completedTricks: ITrick[];
  bidsPlaced: number;
  hostId: string;
  forbiddenBid: number | null;
  roomSettings?: IRoomSettings;
}

/**
 * Result of playing a card
 */
export interface PlayCardResult {
  trickComplete: boolean;
  winnerId?: string;
  roundComplete?: boolean;
}

/**
 * Game aggregate root - the main domain entity that orchestrates all game logic
 *
 * Game flow:
 * LOBBY -> DEALING -> TRUMP_SELECTION/BIDDING -> PLAYING -> ROUND_END -> (repeat or GAME_END)
 */
export class Game {
  private deck: Deck;
  public phase: GamePhase = GamePhase.LOBBY;
  public players: Player[] = [];
  public currentRound: number = 0;
  public maxRounds: number = 0;
  public trumpSuit: Suit | null = null;
  public trumpCard: Card | null = null;
  public currentPlayerIndex: number = 0;
  public dealerIndex: number = 0;
  public currentTrick: Trick | null = null;
  public completedTricks: Trick[] = [];
  public hostId: string;

  constructor(public readonly id: string, hostId: string) {
    this.deck = new Deck();
    this.hostId = hostId;
  }

  // ============================================================================
  // Player Management
  // ============================================================================

  /**
   * Add a player to the game (only in LOBBY phase)
   */
  addPlayer(player: Player): void {
    if (this.phase !== GamePhase.LOBBY) {
      throw new Error('Cannot add players after game has started');
    }
    if (this.players.length >= 6) {
      throw new Error('Maximum 6 players allowed');
    }
    if (this.players.some((p) => p.id === player.id)) {
      throw new Error('Player already in game');
    }
    this.players.push(player);
  }

  /**
   * Remove a player from the game
   */
  removePlayer(playerId: string): void {
    const index = this.players.findIndex((p) => p.id === playerId);
    if (index !== -1) {
      this.players.splice(index, 1);
    }
  }

  /**
   * Get player by ID
   */
  getPlayer(playerId: string): Player | undefined {
    return this.players.find((p) => p.id === playerId);
  }

  /**
   * Get the current player (whose turn it is)
   */
  getCurrentPlayer(): Player {
    return this.players[this.currentPlayerIndex];
  }

  /**
   * Get the current dealer
   */
  getDealer(): Player {
    return this.players[this.dealerIndex];
  }

  // ============================================================================
  // Game Flow
  // ============================================================================

  /**
   * Check if game can start (3-6 players required)
   */
  canStart(): boolean {
    return this.players.length >= 3 && this.players.length <= 6;
  }

  /**
   * Start the game
   */
  start(): void {
    if (!this.canStart()) {
      throw new Error('Need 3-6 players to start');
    }

    // Calculate max rounds based on player count
    // 60 cards total, each round deals (round number) cards per player
    this.maxRounds = Math.floor(60 / this.players.length);

    this.currentRound = 0;
    this.dealerIndex = 0;
    this.startNewRound();
  }

  /**
   * Start a new round
   */
  private startNewRound(): void {
    this.currentRound++;
    this.phase = GamePhase.DEALING;

    // Reset players for new round
    this.players.forEach((player) => player.resetForNewRound());

    // Reset deck and shuffle
    this.deck.reset();
    this.deck.shuffle();

    // Deal cards (round number = cards per player)
    const cardsPerPlayer = this.currentRound;
    for (const player of this.players) {
      const cards = this.deck.deal(cardsPerPlayer);
      player.receiveCards(cards);
    }

    // Determine trump
    this.trumpCard = this.deck.drawOne();
    this.determineTrump();

    // Clear tricks
    this.currentTrick = null;
    this.completedTricks = [];

    // First player to bid/play is left of dealer
    this.currentPlayerIndex = (this.dealerIndex + 1) % this.players.length;
  }

  /**
   * Determine trump suit based on revealed card
   */
  private determineTrump(): void {
    if (this.trumpCard === null) {
      // No cards left - no trump (last round with exact cards)
      this.trumpSuit = null;
      this.phase = GamePhase.BIDDING;
    } else if (this.trumpCard.isJester()) {
      // Jester - no trump
      this.trumpSuit = null;
      this.phase = GamePhase.BIDDING;
    } else if (this.trumpCard.isWizard()) {
      // Wizard - dealer chooses trump
      this.phase = GamePhase.TRUMP_SELECTION;
    } else {
      // Number card - that suit is trump
      this.trumpSuit = this.trumpCard.suit;
      this.phase = GamePhase.BIDDING;
    }
  }

  /**
   * Select trump suit (only dealer, only in TRUMP_SELECTION phase)
   */
  selectTrump(playerId: string, suit: Suit): void {
    if (this.phase !== GamePhase.TRUMP_SELECTION) {
      throw new Error('Not in trump selection phase');
    }
    if (this.getDealer().id !== playerId) {
      throw new Error('Only dealer can select trump');
    }

    this.trumpSuit = suit;
    this.phase = GamePhase.BIDDING;
  }

  // ============================================================================
  // Bidding
  // ============================================================================

  /**
   * Place a bid for the current round
   */
  placeBid(playerId: string, bid: number): void {
    if (this.phase !== GamePhase.BIDDING) {
      throw new Error('Not in bidding phase');
    }

    const player = this.getPlayer(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (this.getCurrentPlayer().id !== playerId) {
      throw new Error('Not your turn to bid');
    }

    // Check forbidden bid (last bidder can't make total equal round number)
    const bidsPlaced = this.players.filter((p) => p.bid !== null).length;
    const isLastBidder = bidsPlaced === this.players.length - 1;

    if (isLastBidder) {
      const currentTotal = this.players.reduce((sum, p) => sum + (p.bid ?? 0), 0);
      const forbiddenBid = this.currentRound - currentTotal;
      if (bid === forbiddenBid && forbiddenBid >= 0 && forbiddenBid <= this.currentRound) {
        throw new Error(`Cannot bid ${forbiddenBid} - total bids cannot equal ${this.currentRound}`);
      }
    }

    player.placeBid(bid);
    this.advanceToNextPlayer();

    // Check if all players have bid
    if (this.players.every((p) => p.bid !== null)) {
      this.startPlaying();
    }
  }

  /**
   * Get the forbidden bid for the last bidder (null if not last bidder)
   */
  getForbiddenBid(): number | null {
    const bidsPlaced = this.players.filter((p) => p.bid !== null).length;
    const isLastBidder = bidsPlaced === this.players.length - 1;
    if (!isLastBidder) return null;

    const currentTotal = this.players.reduce((sum, p) => sum + (p.bid ?? 0), 0);
    const forbiddenBid = this.currentRound - currentTotal;
    if (forbiddenBid >= 0 && forbiddenBid <= this.currentRound) {
      return forbiddenBid;
    }
    return null;
  }

  /**
   * Transition to playing phase
   */
  private startPlaying(): void {
    this.phase = GamePhase.PLAYING;
    this.currentTrick = new Trick(this.trumpSuit);
    // First player is left of dealer
    this.currentPlayerIndex = (this.dealerIndex + 1) % this.players.length;
  }

  // ============================================================================
  // Playing
  // ============================================================================

  /**
   * Play a card from hand
   */
  playCard(playerId: string, cardId: string): PlayCardResult {
    if (this.phase !== GamePhase.PLAYING) {
      throw new Error('Not in playing phase');
    }

    const player = this.getPlayer(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (this.getCurrentPlayer().id !== playerId) {
      throw new Error('Not your turn to play');
    }

    if (!this.currentTrick) {
      throw new Error('No current trick');
    }

    // Validate card is playable
    const playableCards = player.getPlayableCards(this.currentTrick.getLeadSuit());
    if (!playableCards.some((c) => c.id === cardId)) {
      throw new Error('Cannot play this card - must follow suit');
    }

    const card = player.playCard(cardId);
    this.currentTrick.playCard(playerId, card);

    // Check if trick is complete
    if (this.currentTrick.isComplete(this.players.length)) {
      return this.completeTrick();
    } else {
      this.advanceToNextPlayer();
      return { trickComplete: false };
    }
  }

  /**
   * Complete the current trick
   */
  private completeTrick(): PlayCardResult {
    if (!this.currentTrick) {
      throw new Error('No current trick');
    }

    const winnerId = this.currentTrick.determineWinner();
    const winner = this.getPlayer(winnerId);
    if (winner) {
      winner.winTrick();
    }

    this.completedTricks.push(this.currentTrick);

    // Check if round is complete
    if (this.players[0].hand.length === 0) {
      this.completeRound();
      return { trickComplete: true, winnerId, roundComplete: true };
    } else {
      // Winner leads next trick
      this.currentPlayerIndex = this.players.findIndex((p) => p.id === winnerId);
      this.currentTrick = new Trick(this.trumpSuit);
      return { trickComplete: true, winnerId };
    }
  }

  /**
   * Complete the current round
   */
  private completeRound(): void {
    this.phase = GamePhase.ROUND_END;

    // Calculate and apply scores
    for (const player of this.players) {
      player.applyRoundScore();
    }

    // Check if game is complete
    if (this.currentRound >= this.maxRounds) {
      this.phase = GamePhase.GAME_END;
    }
  }

  /**
   * Start the next round (only host, only in ROUND_END phase)
   */
  startNextRound(): void {
    if (this.phase !== GamePhase.ROUND_END) {
      throw new Error('Round not complete');
    }

    // Move dealer to next player
    this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
    this.startNewRound();
  }

  /**
   * Advance to the next player
   */
  private advanceToNextPlayer(): void {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
  }

  // ============================================================================
  // Getters
  // ============================================================================

  /**
   * Get number of bids placed this round
   */
  getBidsPlaced(): number {
    return this.players.filter((p) => p.bid !== null).length;
  }

  /**
   * Get total bids for this round
   */
  getTotalBids(): number {
    return this.players.reduce((sum, p) => sum + (p.bid ?? 0), 0);
  }

  /**
   * Get the winner of the game (only in GAME_END phase)
   */
  getWinner(): Player | null {
    if (this.phase !== GamePhase.GAME_END) return null;
    return this.players.reduce((highest, player) =>
      player.score > highest.score ? player : highest
    );
  }

  // ============================================================================
  // Serialization
  // ============================================================================

  /**
   * Serialize to plain object for network transfer
   */
  toJSON(): IGameState {
    return {
      id: this.id,
      phase: this.phase,
      players: this.players.map((p) => p.toJSON()),
      currentRound: this.currentRound,
      maxRounds: this.maxRounds,
      trumpSuit: this.trumpSuit,
      trumpCard: this.trumpCard?.toJSON() ?? null,
      currentPlayerIndex: this.currentPlayerIndex,
      dealerIndex: this.dealerIndex,
      currentTrick: this.currentTrick?.toJSON() ?? null,
      completedTricks: this.completedTricks.map((t) => t.toJSON()),
      bidsPlaced: this.getBidsPlaced(),
      hostId: this.hostId,
      forbiddenBid: this.getForbiddenBid(),
    };
  }

  /**
   * Deserialize from plain object
   */
  static fromJSON(data: IGameState): Game {
    const game = new Game(data.id, data.hostId);
    game.phase = data.phase;
    game.players = data.players.map((p) => Player.fromJSON(p));
    game.currentRound = data.currentRound;
    game.maxRounds = data.maxRounds;
    game.trumpSuit = data.trumpSuit;
    game.trumpCard = data.trumpCard ? Card.fromJSON(data.trumpCard) : null;
    game.currentPlayerIndex = data.currentPlayerIndex;
    game.dealerIndex = data.dealerIndex;
    game.currentTrick = data.currentTrick
      ? Trick.fromJSON(data.currentTrick, data.trumpSuit)
      : null;
    game.completedTricks = data.completedTricks.map((t) =>
      Trick.fromJSON(t, data.trumpSuit)
    );
    return game;
  }
}
