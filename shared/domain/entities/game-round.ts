/**
 * Game round layer: starting the game, dealing, trump, bidding, scoring and the
 * round lifecycle. Bidding invariants live here so the aggregate is safe even
 * when a caller skips the use-case checks.
 */

import { Card } from './card';
import { GameLobby } from './game-lobby';
import { Player } from './player';
import { ALL_SUITS, Suit } from '../value-objects/card-types';
import { GamePhase } from '../value-objects/game-phase';
import { computeForbiddenBid, getCardsForRound, getRoundCount, isBidInRange } from '../expansions/round-rules';
import { revealTrump } from '../expansions/trump-reveal';
import { getStandings, getWinnerIds, type IStanding } from '../services/standings.service';
import { createBidVisibilityPolicy, type IBidVisibilityPolicy } from '../services/bid-visibility';
import {
  BidAlreadyPlacedError,
  ForbiddenBidError,
  InvalidBidError,
  InvalidPhaseError,
  InvalidTrumpSuitError,
  NoTrumpNotAllowedError,
  NotEnoughPlayersError,
  NotTrumpChooserError,
  NotYourTurnError,
  PlayerNotFoundError,
  PlayersReconnectingError,
} from '../errors';
import { ROOM_PLAYER_LIMITS } from './room-settings';

export abstract class GameRound extends GameLobby {
  // ==========================================================================
  // Round lifecycle
  // ==========================================================================

  /**
   * Start the game: plan the rounds and deal the first one
   */
  start(): void {
    if (!this.canStart()) {
      if (this.hasDisconnectedHumanPlayers()) throw new PlayersReconnectingError();
      throw new NotEnoughPlayersError(ROOM_PLAYER_LIMITS.MIN, this.getStartablePlayerCount());
    }
    if (this.phase !== GamePhase.LOBBY) throw new InvalidPhaseError(GamePhase.LOBBY, this.phase);

    this.maxRounds = getRoundCount(this.players.length, this.rulesetConfig.structure);
    this.currentRound = 0;
    this.dealerIndex = 0;
    this.startNewRound();
  }

  /**
   * Start the next round (only in ROUND_END phase); the deal moves one seat on
   */
  startNextRound(): void {
    if (this.phase !== GamePhase.ROUND_END) throw new InvalidPhaseError(GamePhase.ROUND_END, this.phase);
    this.assertNotPaused();
    this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
    this.startNewRound();
  }

  private startNewRound(): void {
    this.currentRound++;
    this.transitionTo(GamePhase.DEALING);
    this.roundEndedAt = null;
    this.players.forEach((player) => player.resetForNewRound());

    this.deck.reset(this.rulesetConfig.expansions.specialCards);
    this.deck.shuffle();
    const cardsPerPlayer = this.getCardsPerPlayerForCurrentRound();
    for (const player of this.players) {
      player.receiveCards(this.deck.deal(cardsPerPlayer));
    }

    this.determineTrump();
    this.currentTrick = null;
    this.completedTricks = [];
    this.pendingEffects = [];

    // First player to bid/play is left of dealer
    this.currentPlayerIndex = this.getFirstPlayerIndex();
    this.restartTurnTimerForCurrentTurn();
  }

  protected getFirstPlayerIndex(): number {
    return (this.dealerIndex + 1) % this.players.length;
  }

  getCardsPerPlayerForCurrentRound(): number {
    if (this.currentRound <= 0 || this.maxRounds <= 0) return 0;
    return getCardsForRound(this.currentRound, this.maxRounds, this.rulesetConfig.structure);
  }

  /**
   * Score the round, then end it (or the game after the last round)
   */
  protected completeRound(): void {
    this.transitionTo(GamePhase.ROUND_END);
    this.roundEndedAt = this.clock.now();
    this.clearTurnTimer();
    for (const player of this.players) {
      player.applyRoundScore(this.rulesetConfig.scoring);
    }
    if (this.currentRound >= this.maxRounds) {
      this.transitionTo(GamePhase.GAME_END);
    }
  }

  protected advanceToNextPlayer(): void {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
  }

  // ==========================================================================
  // Trump
  // ==========================================================================

  /**
   * Turn up the trump card and determine trump or who chooses it
   * (delegated to the trump-reveal domain service; a Werewolf holder swaps here)
   */
  private determineTrump(): void {
    const result = revealTrump({
      draw: () => this.deck.drawOne(),
      dealerId: this.getDealer().id,
      hands: this.players.map((player) => ({ playerId: player.id, hand: player.hand })),
    });

    if (result.werewolfSwap && result.trumpCard) {
      const holder = this.getPlayer(result.werewolfSwap.playerId);
      holder?.takeCard(result.trumpCard.id);
      holder?.receiveCards([Card.fromJSON(result.werewolfSwap.takenCard)]);
    }

    this.trumpCard = result.trumpCard ? Card.fromJSON(result.trumpCard) : null;
    this.trumpSuit = result.trumpSuit;
    this.trumpChoice = result.trumpChoice;
    this.expansionState = {
      copySource: result.copySource ? Card.fromJSON(result.copySource).toJSON() : null,
      setAsideCards: result.setAside.map((card) => Card.fromJSON(card).toJSON()),
      werewolfSwap: result.werewolfSwap
        ? { ...result.werewolfSwap, takenCard: Card.fromJSON(result.werewolfSwap.takenCard).toJSON() }
        : null,
    };
    this.transitionTo(result.trumpChoice ? GamePhase.TRUMP_SELECTION : GamePhase.BIDDING);
  }

  /**
   * The player who decides trump in TRUMP_SELECTION
   */
  getTrumpChooser(): Player | undefined {
    if (this.trumpChoice) return this.getPlayer(this.trumpChoice.playerId);
    return this.phase === GamePhase.TRUMP_SELECTION ? this.getDealer() : undefined;
  }

  /**
   * Select trump suit (only the trump chooser, only in TRUMP_SELECTION phase).
   * `null` declares no trump where the choice allows it (Werewolf).
   */
  selectTrump(playerId: string, suit: Suit | null): void {
    if (this.phase !== GamePhase.TRUMP_SELECTION) {
      throw new InvalidPhaseError(GamePhase.TRUMP_SELECTION, this.phase);
    }
    this.assertNotPaused();
    if (this.getTrumpChooser()?.id !== playerId) throw new NotTrumpChooserError();
    if (suit === null) {
      if (!this.trumpChoice?.allowNoTrump) throw new NoTrumpNotAllowedError();
    } else if (!ALL_SUITS.includes(suit)) {
      throw new InvalidTrumpSuitError(suit);
    }

    this.trumpSuit = suit;
    this.trumpChoice = null;
    this.transitionTo(GamePhase.BIDDING);
    this.restartTurnTimerForCurrentTurn();
  }

  // ==========================================================================
  // Bidding
  // ==========================================================================

  /**
   * Place a bid: the current player's, once, a whole number from 0 to the cards
   * dealt, and not the forbidden bid of the hook rule.
   */
  placeBid(playerId: string, bid: number): void {
    if (this.phase !== GamePhase.BIDDING) throw new InvalidPhaseError(GamePhase.BIDDING, this.phase);
    this.assertNotPaused();
    const player = this.getPlayer(playerId);
    if (!player) throw new PlayerNotFoundError(playerId);
    if (this.getCurrentPlayer().id !== playerId) throw new NotYourTurnError('bid');
    if (player.bid !== null) throw new BidAlreadyPlacedError();

    const cards = this.getCardsPerPlayerForCurrentRound();
    if (!isBidInRange(bid, cards)) throw new InvalidBidError(bid, cards);
    const forbiddenBid = this.getForbiddenBidFor(playerId);
    if (forbiddenBid !== null && bid === forbiddenBid) throw new ForbiddenBidError(forbiddenBid, cards);

    player.placeBid(bid);
    this.advanceToNextPlayer();

    if (this.players.every((p) => p.bid !== null)) {
      this.startPlaying();
    } else {
      this.restartTurnTimerForCurrentTurn();
    }
  }

  /**
   * The forbidden bid for the player about to bid (hook rule); null when that
   * player may bid anything or it is not bidding time.
   */
  getForbiddenBid(): number | null {
    if (this.phase !== GamePhase.BIDDING) return null;
    const current = this.getCurrentPlayer();
    return current ? this.getForbiddenBidFor(current.id) : null;
  }

  /**
   * The forbidden bid for one player: only the last player without a bid has one.
   */
  getForbiddenBidFor(playerId: string): number | null {
    const player = this.getPlayer(playerId);
    if (!player || player.bid !== null) return null;
    const otherBids = this.players.filter((p) => p !== player).map((p) => p.bid);
    return computeForbiddenBid(otherBids, this.getCardsPerPlayerForCurrentRound(), this.rulesetConfig.bidding);
  }

  /**
   * What bidding information a seat may see (hidden-bids rule)
   */
  getBidVisibility(viewerId: string): IBidVisibilityPolicy {
    const restricted = this.getForbiddenBid() !== null ? this.getCurrentPlayer().id : null;
    return createBidVisibilityPolicy({
      biddingRules: this.rulesetConfig.bidding,
      allBidsPlaced: this.players.length > 0 && this.players.every((p) => p.bid !== null),
      viewerId,
      restrictedBidderId: restricted,
    });
  }

  getBidsPlaced(): number {
    return this.players.filter((p) => p.bid !== null).length;
  }

  getTotalBids(): number {
    return this.players.reduce((sum, p) => sum + (p.bid ?? 0), 0);
  }

  private startPlaying(): void {
    this.transitionTo(GamePhase.PLAYING);
    this.currentTrick = this.newTrick();
    this.currentPlayerIndex = this.getFirstPlayerIndex();
    this.restartTurnTimerForCurrentTurn();
  }

  // ==========================================================================
  // Results
  // ==========================================================================

  /**
   * Standings by score with competition ranking (ties share a rank)
   */
  getStandings(): IStanding[] {
    return getStandings(this.players);
  }

  /**
   * Every player sharing the best score once the game is over
   */
  getWinnerIds(): string[] {
    return this.phase === GamePhase.GAME_END ? getWinnerIds(this.players) : [];
  }

  /**
   * A winner of the game (only in GAME_END phase); with a tie, the first seat of
   * the co-winners. Prefer getWinnerIds, which reports every co-winner.
   */
  getWinner(): Player | null {
    const [winnerId] = this.getWinnerIds();
    return winnerId ? this.getPlayer(winnerId) ?? null : null;
  }
}
