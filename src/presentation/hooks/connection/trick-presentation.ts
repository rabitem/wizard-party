import { GamePhase, type CardPhysicsState, type CustomSound, type ICard, type IGameState } from '@shared/domain';
import { TRICK_PRESENTATION } from '@/presentation/config/trick-presentation.config';
import type { ReadableStore } from '@/presentation/state/external-store';
import type { TrickResult } from '@/presentation/types';

import {
  completePlayedCardAnimation,
  createPlayedCardAnimationSequencer,
  enqueuePlayedCardAnimation,
  enqueuePlayedCardAnimations,
  fastForwardPlayedCardBacklog,
  markPlayedCardsVisible,
  resetPlayedCardAnimationSequencer,
  syncPlayedCardAnimationSequencerToCurrentCards,
  withdrawPlayedCard,
} from './played-card-animation-sequencer';
import {
  clearPlayedCardRegistry,
  createPlayedCardRegistry,
  forgetPlayedCard,
  forgetPlayedCards,
  liveSnapshotCards,
  markPlayedCardLanded,
  prunePlayedCardRegistry,
  recordPlayedCard,
  settlePlayedCardsAtRest,
  trackSnapshotCards,
} from './played-card-registry';
import {
  buildTrickCompleteKey,
  createTrickCompleteLifecycle,
  deferTrickComplete,
  markTrickCompleteProcessed,
  resetTrickCompleteLifecycle,
  resolveTrickCompleteSnapshot,
  resolveTrickGameStateUpdate,
  type DeferredTrickComplete,
} from './trick-complete-lifecycle';
import { getMissedTrickCompleteReplay, hasRoundChanged } from './trick-replay-recovery';
import type { PreservedTrick } from './types';

export interface CardPlayedInput {
  cardId: string | undefined;
  soundChoice?: string;
  physicsState?: CardPhysicsState;
  customAudio?: CustomSound;
  /** The local player's own card skips the opponent queue (and lands every card before it). */
  isLocalPlayer?: boolean;
}

export interface TrickCompleteInput {
  winnerId: string;
  winnerName: string;
  /** A Bomb destroyed the trick: winnerId only leads next. */
  voided?: boolean;
  soundChoice: string | undefined;
  customTrickWinAudio?: TrickResult['customTrickWinAudio'];
  trickCards: { playerId: string; card: ICard }[] | undefined;
  trickIndex?: number;
  /** The server's game state when the trick completed. */
  currentState: IGameState | null;
  timestamp: number;
}

/** What the table renders of the trick lifecycle (immutable; a new object per change). */
export interface TrickPresentationView {
  /** The completed trick whose cards have all landed: its winner collects them. */
  trickResult: TrickResult | null;
  /** A completed trick whose cards are still landing. */
  pendingTrickResult: TrickResult | null;
  /** From TRICK_COMPLETE until the trick is collected. */
  isTrickAnimating: boolean;
  /** Shown instead of the server's current trick while a completed trick is presented. */
  frozenTrick: PreservedTrick | null;
  /** Played cards released into the visible table sequence. */
  visiblePlayedCardIds: ReadonlySet<string>;
  /** Cards announced but still waiting for their flight. */
  backlog: number;
}

export interface SnapshotPresentation {
  recoveredMissedTrick: boolean;
  /** Cards of the shown trick queued from the snapshot without a CARD_PLAYED seen first. */
  replayedCardCount: number;
}

const EMPTY_VIEW: TrickPresentationView = {
  trickResult: null,
  pendingTrickResult: null,
  isTrickAnimating: false,
  frozenTrick: null,
  visiblePlayedCardIds: new Set(),
  backlog: 0,
};

function trickCardIds(trick: { cards: { card: Pick<ICard, 'id'> }[] } | null | undefined): string[] {
  return trick?.cards.map((played) => played.card.id) ?? [];
}

function sameIds(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) if (!b.has(id)) return false;
  return true;
}

function isLocalTurn(state: IGameState, localPlayerId: string | null): boolean {
  return state.phase === GamePhase.PLAYING && !!localPlayerId && state.players[state.currentPlayerIndex]?.id === localPlayerId;
}

/**
 * The one owner of the trick timeline on the client: played -> landed -> completed (pending
 * result) -> all landed (result) -> collected. It never changes the server's state; the table
 * shows `frozenTrick` instead of the server's current trick while a completed trick is presented,
 * and catches up after the collection from the latest snapshot it was given (no state request).
 *
 * Absorbs the pure lifecycle modules: the played-card registry (metadata, landed cards), the
 * sequencer (flight order, catch-up) and the trick-complete lifecycle (dedupe, deferral).
 */
export class TrickPresentation implements ReadableStore<TrickPresentationView> {
  private view: TrickPresentationView = EMPTY_VIEW;
  private readonly listeners = new Set<() => void>();
  private server: IGameState | null = null;
  private result: TrickResult | null = null;
  private pending: TrickResult | null = null;
  private animating = false;
  private preserved: PreservedTrick | null = null;
  private shouldPreserve = false;
  /** The local player's card thrown before the server confirmed it (not yet in a snapshot). */
  private localPlay: string | null = null;
  private deferred: DeferredTrickComplete<TrickCompleteInput>[] = [];
  private readonly lifecycle = createTrickCompleteLifecycle();
  private readonly sequencer = createPlayedCardAnimationSequencer();
  private readonly registry = createPlayedCardRegistry();

  getState = (): TrickPresentationView => this.view;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** A completed trick is landing or being presented: the next one waits for its collection. */
  isBusy(): boolean {
    return this.pending !== null || this.result !== null;
  }

  /** A GAME_STATE was applied (`previous` is the server state before it). */
  applySnapshot(previous: IGameState | null, next: IGameState, timestamp: number, localPlayerId: string | null): SnapshotPresentation {
    const recoveredMissedTrick = this.recoverMissedTrickComplete(previous, next, timestamp);
    if (hasRoundChanged(previous, next)) this.reset();
    this.preserved = resolveTrickGameStateUpdate({
      newState: next,
      existingPreserved: this.preserved,
      shouldPreserveTrick: this.shouldPreserve,
      hasPendingOrActiveResult: this.isBusy(),
      activeTrickWinnerId: this.pending?.winnerId ?? this.result?.winnerId ?? null,
    });
    this.server = next;
    const replayedCardCount = this.replay();
    // The player is to act: show the trick they act on now instead of after the queued flights.
    if (!this.isBusy() && isLocalTurn(next, localPlayerId)) this.fastForward(0);
    this.publish();
    return { recoveredMissedTrick, replayedCardCount };
  }

  /** CARD_PLAYED, or the local player's own play the moment it is made. */
  cardPlayed({ cardId, soundChoice, physicsState, customAudio, isLocalPlayer = false }: CardPlayedInput): void {
    if (!cardId) return;
    const metadata = { soundChoice, customAudio, physicsState };
    if (isLocalPlayer && this.sequencer.visibleCardIds.has(cardId)) {
      // The server's echo of a play that is already on the table: keep its flight as it is.
      this.registry.metadata.set(cardId, metadata);
      return;
    }
    recordPlayedCard(this.registry, cardId, metadata);
    if (isLocalPlayer) {
      this.localPlay = cardId;
      this.fastForward(0);
    }
    enqueuePlayedCardAnimation(this.sequencer, cardId, { immediate: isLocalPlayer });
    this.publish();
  }

  /** TRICK_COMPLETE. A trick completing while the previous one is presented waits for it. */
  trickCompleted(input: TrickCompleteInput): void {
    if (this.isBusy()) {
      deferTrickComplete(this.lifecycle, this.deferred, this.keyOf(input), input);
      return;
    }
    this.present(input);
    this.publish();
  }

  /**
   * Every card the table shows landed. The completed trick is collected only once none of its
   * cards still waits to fly: after a replay (a reconnect) the table can report on the cards shown
   * so far; it reports again when the queued ones have landed. Cards of the next trick wait anyway.
   */
  allCardsLanded(): void {
    if (!this.pending) return;
    const trickCards = new Set(trickCardIds(this.preserved));
    if (this.sequencer.pendingCardIds.some((cardId) => trickCards.has(cardId))) return;
    this.result = this.pending;
    this.pending = null;
    this.publish();
  }

  /** The completed trick was collected: present a deferred one, or catch up with the server. */
  trickCollected(): void {
    const collectedCardIds = trickCardIds(this.preserved);
    this.clearResult();
    forgetPlayedCards(this.registry, collectedCardIds);
    resetPlayedCardAnimationSequencer(this.sequencer);
    this.presentNextDeferred();
    this.replay();
    this.publish();
  }

  /** A played card finished its flight (or was placed at rest). */
  playedCardLanded(cardId: string): void {
    markPlayedCardLanded(this.registry, cardId);
    completePlayedCardAnimation(this.sequencer, cardId);
    this.publish();
  }

  /** The server refused a local play that was already shown: take it off the table. */
  retractLocalPlay(cardId: string): void {
    if (this.localPlay === cardId) this.localPlay = null;
    forgetPlayedCard(this.registry, cardId);
    withdrawPlayedCard(this.sequencer, cardId);
    this.publish();
  }

  /** Disconnect, leave, a new round; a rematch also forgets which tricks were presented. */
  reset({ forgetPresentedTricks = false } = {}): void {
    this.deferred = [];
    this.localPlay = null;
    clearPlayedCardRegistry(this.registry);
    resetPlayedCardAnimationSequencer(this.sequencer);
    this.clearResult();
    if (forgetPresentedTricks) {
      resetTrickCompleteLifecycle(this.lifecycle);
      this.server = null;
    }
    this.publish();
  }

  getCardSoundChoice(cardId: string): string | null {
    return this.registry.metadata.get(cardId)?.soundChoice ?? null;
  }

  getCardCustomAudio(cardId: string): CustomSound | null {
    return this.registry.metadata.get(cardId)?.customAudio ?? null;
  }

  getCardPhysicsState(cardId: string): CardPhysicsState | null {
    return this.registry.metadata.get(cardId)?.physicsState ?? null;
  }

  /** Visible and still to fly in with physics (any other visible card is placed at rest). */
  isAnimatedCard(cardId: string): boolean {
    return this.registry.animatedCardIds.has(cardId);
  }

  private keyOf(input: TrickCompleteInput): string {
    return buildTrickCompleteKey(input.winnerId, input.trickCards, input.trickIndex, input.currentState?.currentRound, input.timestamp);
  }

  private present(input: TrickCompleteInput): void {
    if (!markTrickCompleteProcessed(this.lifecycle, this.keyOf(input))) return;
    const preserved = resolveTrickCompleteSnapshot({
      trickCards: input.trickCards,
      currentState: input.currentState,
      existingPreserved: this.preserved,
      winnerId: input.winnerId,
    });
    if (preserved) this.preserved = preserved;
    if (this.localPlay && trickCardIds(this.preserved).includes(this.localPlay)) this.localPlay = null;
    this.shouldPreserve = true;
    this.animating = true;
    const { winnerId, winnerName, timestamp, soundChoice, customTrickWinAudio, voided } = input;
    this.pending = { winnerId, winnerName, timestamp, soundChoice, customTrickWinAudio, ...(voided ? { voided } : {}) };
  }

  private presentNextDeferred(): void {
    const deferred = this.deferred.shift();
    if (!deferred) return;
    const latest = this.server ?? deferred.params.currentState;
    this.queueCards(trickCardIds({ cards: deferred.params.trickCards ?? [] }));
    this.present({ ...deferred.params, currentState: latest ? { ...latest, currentTrick: null } : null });
  }

  /**
   * A snapshot shows a trick completed that no TRICK_COMPLETE announced (missed while away). While
   * another trick is presented it waits for that collection, like a live completion would.
   */
  private recoverMissedTrickComplete(previous: IGameState | null, next: IGameState, timestamp: number): boolean {
    const replay = getMissedTrickCompleteReplay({ previousState: previous, nextState: next, eventTimestamp: timestamp });
    if (!replay) return false;
    if (this.isBusy()) return deferTrickComplete(this.lifecycle, this.deferred, this.keyOf(replay), replay);
    this.queueCards(trickCardIds({ cards: replay.trickCards }));
    this.present(replay);
    return true;
  }

  private isFrozen(): boolean {
    return this.shouldPreserve || this.isBusy();
  }

  /** Syncs the sequencer to the shown trick and queues its unseen cards. */
  private replay(): number {
    const frozen = this.isFrozen() && !!this.preserved;
    const shownTrick = frozen ? this.preserved : this.server?.currentTrick;
    const shownIds = trickCardIds(shownTrick);
    if (this.localPlay && shownIds.includes(this.localPlay)) this.localPlay = null;
    // A local throw the server has not confirmed yet stays on the open trick (after its cards).
    if (this.localPlay && !frozen) shownIds.push(this.localPlay);
    const cardIds = liveSnapshotCards(this.registry, shownIds);
    syncPlayedCardAnimationSequencerToCurrentCards(this.sequencer, cardIds);
    // Metadata of the server's live trick (hidden behind a frozen one) and of deferred tricks is kept.
    const keep = new Set([
      ...cardIds,
      ...trickCardIds(this.server?.currentTrick),
      ...this.deferred.flatMap(({ params }) => trickCardIds({ cards: params.trickCards ?? [] })),
    ]);
    prunePlayedCardRegistry(this.registry, keep);
    return this.queueCards(cardIds);
  }

  private queueCards(cardIds: string[]): number {
    const landedCardIds = trackSnapshotCards(this.registry, cardIds);
    markPlayedCardsVisible(this.sequencer, landedCardIds);
    const replay = enqueuePlayedCardAnimations(this.sequencer, cardIds, { maxBacklog: TRICK_PRESENTATION.MAX_FLIGHT_BACKLOG });
    settlePlayedCardsAtRest(this.registry, replay.restedCardIds);
    return replay.queuedCount;
  }

  private fastForward(maxBacklog: number): void {
    settlePlayedCardsAtRest(this.registry, fastForwardPlayedCardBacklog(this.sequencer, maxBacklog));
  }

  private clearResult(): void {
    this.result = null;
    this.pending = null;
    this.preserved = null;
    this.shouldPreserve = false;
    this.animating = false;
  }

  private publish(): void {
    const visible = sameIds(this.view.visiblePlayedCardIds, this.sequencer.visibleCardIds)
      ? this.view.visiblePlayedCardIds
      : new Set(this.sequencer.visibleCardIds);
    const next: TrickPresentationView = {
      trickResult: this.result,
      pendingTrickResult: this.pending,
      isTrickAnimating: this.animating,
      frozenTrick: this.isFrozen() ? this.preserved : null,
      visiblePlayedCardIds: visible,
      backlog: this.sequencer.pendingCardIds.length,
    };
    const unchanged = (Object.keys(next) as (keyof TrickPresentationView)[]).every((key) => next[key] === this.view[key]);
    if (unchanged) return;
    this.view = next;
    for (const listener of [...this.listeners]) listener();
  }
}
