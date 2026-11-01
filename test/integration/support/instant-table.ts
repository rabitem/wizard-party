/**
 * Stands in for the 3D table of one client. The real table reports three things back to the trick
 * presentation (game-client-context.tsx): a played card finished its flight
 * (handlePlayedCardAnimationComplete -> playedCardLanded), every card of a completed trick landed
 * (activateTrickResult -> allCardsLanded) and the winner collected the trick
 * (clearTrickResult -> trickCollected). This table does the same on the fake clock after
 * `flightMs` and `bannerMs` (0 by default), and records what a player would have seen go wrong:
 * a trick presented twice, or a card that already landed flying in again within one trick (I6).
 */
import type { TrickPresentation, TrickPresentationView } from '@/presentation/hooks/connection/trick-presentation';
import type { TrickResult } from '@/presentation/types';

export interface InstantTableTiming {
  /** How long a thrown card flies before it lands (cards placed at rest land at once). */
  flightMs: number;
  /** How long the winner banner shows before the trick is collected. */
  bannerMs: number;
}

export const INSTANT_TABLE_TIMING: InstantTableTiming = { flightMs: 0, bannerMs: 0 };

/** What the table needs to know about the client it belongs to. */
export interface InstantTableContext {
  /** The round the client's state is in (0 before the first deal). */
  round(): number;
  /** The card is back in the local player's hand (a refused play was taken off the table). */
  isInOwnHand(cardId: string): boolean;
}

function idsOf(view: TrickPresentationView): string[] {
  return view.frozenTrick?.cards.map((played) => played.card.id) ?? [];
}

export class InstantTable {
  /** Completed tricks this client presented (a result shown, then collected). */
  presentedTricks = 0;
  /** What a player would have seen go wrong; empty when the presentation is sound. */
  readonly violations: string[] = [];

  private readonly landed = new Set<string>();
  private readonly flying = new Set<string>();
  /** Cards that landed since the last collection (a second flight of one of them is a replay). */
  private readonly landedThisTrick = new Set<string>();
  private readonly presentedKeys = new Set<string>();
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private collecting: TrickResult | null = null;
  private activating = false;
  private lastRound = 0;
  private readonly unsubscribe: () => void;

  constructor(
    private readonly trick: TrickPresentation,
    private readonly context: InstantTableContext,
    private readonly timing: InstantTableTiming = INSTANT_TABLE_TIMING
  ) {
    this.unsubscribe = trick.subscribe(() => this.render(trick.getState()));
  }

  /** No flight, landing report or collection is scheduled. */
  get isIdle(): boolean {
    return this.timers.size === 0;
  }

  /** What the scheduled work is, for timeout messages. */
  get busyDetail(): string {
    return `${this.timers.size} timers, ${this.flying.size} flying, collecting ${this.collecting ? 'yes' : 'no'}, activating ${this.activating}`;
  }

  dispose(): void {
    this.unsubscribe();
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
  }

  private render(view: TrickPresentationView): void {
    this.followRound();
    const visible = view.visiblePlayedCardIds;
    for (const cardId of [...this.landed]) {
      if (visible.has(cardId)) continue;
      this.landed.delete(cardId);
      if (this.context.isInOwnHand(cardId)) this.landedThisTrick.delete(cardId);
    }
    for (const cardId of visible) {
      if (!this.landed.has(cardId) && !this.flying.has(cardId)) this.fly(cardId);
    }
    if (view.pendingTrickResult && !this.activating && idsOf(view).every((cardId) => this.landed.has(cardId))) {
      this.activating = true;
      this.later(0, () => {
        this.activating = false;
        this.trick.allCardsLanded();
      });
    }
    if (view.trickResult && view.trickResult !== this.collecting) this.present(view.trickResult, view);
  }

  private followRound(): void {
    const round = this.context.round();
    if (round !== this.lastRound) this.landedThisTrick.clear();
    // A rematch deals round 1 again: its tricks are new tricks.
    if (round < this.lastRound) this.presentedKeys.clear();
    this.lastRound = round;
  }

  private fly(cardId: string): void {
    const animated = this.trick.isAnimatedCard(cardId);
    if (animated && this.landedThisTrick.has(cardId)) this.violations.push(`card ${cardId} flew in again within one trick`);
    this.flying.add(cardId);
    this.later(animated ? this.timing.flightMs : 0, () => {
      this.flying.delete(cardId);
      // A card taken off the table before it landed reports nothing (the real table unmounts it).
      if (!this.trick.getState().visiblePlayedCardIds.has(cardId)) return;
      this.landed.add(cardId);
      this.landedThisTrick.add(cardId);
      this.trick.playedCardLanded(cardId);
      // Like useCardLandingTracking: the table checks on each card's own rest whether the trick is
      // complete. A landing need not change the presentation, so no notification would follow.
      this.render(this.trick.getState());
    });
  }

  private present(result: TrickResult, view: TrickPresentationView): void {
    this.collecting = result;
    const key = `${this.lastRound}|${[...idsOf(view)].sort().join(',')}`;
    if (this.presentedKeys.has(key)) this.violations.push(`trick ${key} presented twice`);
    this.presentedKeys.add(key);
    this.presentedTricks += 1;
    this.later(this.timing.bannerMs, () => {
      if (this.trick.getState().trickResult !== result) return;
      this.landedThisTrick.clear();
      this.trick.trickCollected();
    });
  }

  private later(ms: number, task: () => void): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      task();
    }, ms);
    this.timers.add(timer);
  }
}
