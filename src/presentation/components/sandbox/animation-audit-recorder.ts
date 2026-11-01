import { SANDBOX_AUDIT } from '../../config/sandbox.config';
import type { SceneObjectKind } from '../three/scene-object-names';
import { AuditLog, round } from './audit-log';
import { RunRenderLedger, reactTotalsBetween } from './render-metrics';
import { SceneTrackAudit, TABLE_KINDS, type FrameContext, type Track } from './scene-track-audit';
import type {
  Anomaly,
  AnomalyCode,
  ObjectSample,
  ReactCommitTotals,
  RenderSample,
  RunMetrics,
  SceneInventory,
  SnapshotRecord,
  TimelineEntry,
  TimelineKind,
} from './sandbox.types';

export interface EndState {
  trickResult: boolean;
  pendingTrickResult: boolean;
  isTrickAnimating: boolean;
  handAnimation: string;
  localHandSize: number | null;
  phase: string | null;
}

export interface RecorderOptions {
  /** Per-frame motion invariants; off when the probe samples only every Nth frame (perf mode). */
  motionChecks?: boolean;
}

/** What the scene looked like when it finished loading. */
export interface ReadyState {
  react?: ReactCommitTotals;
  inventory?: SceneInventory | null;
}

const NO_REACT_TOTALS: ReactCommitTotals = { domCommits: null, r3fCommits: null, r3fRenders: null, r3fRendersPerCommitMax: null };

/**
 * Turns per-frame scene samples and lifecycle events into a timeline and anomalies.
 *
 * Per-object checks live in SceneTrackAudit; this class owns the trick lifecycle: one card
 * flies at a time, the trick result waits for every landing, collection waits for the
 * result, completion waits for every collected card, and nothing played goes unanimated.
 * Pure (no DOM, no three.js), so every invariant is unit-testable.
 */
export class AnimationAuditRecorder {
  private readonly audit = new AuditLog();
  private readonly scene = new SceneTrackAudit(this.audit, {
    onMount: (t, sample) => this.onMount(t, sample),
    onUnmount: (t, track) => this.onUnmount(t, track),
    isPlayedCardAnimating: (cardId) => this.playedAnimating.has(cardId),
  });
  private readonly playedAnimating = new Set<string>();
  private readonly landedCards = new Set<string>();
  private readonly announcedCards = new Set<string>();
  private readonly animatedCards = new Set<string>();
  /** Plays the client finished before their card was first sampled: placed at rest, never flying. */
  private readonly restedPlays = new Set<string>();
  private readonly collectedCards = new Set<string>();
  private readonly completedTrickCards = new Set<string>();
  /** Cards the local player threw; they answer the player's own input and may fly alongside an opponent's. */
  private readonly localCards = new Set<string>();
  private allLandedForTrick = false;
  private undrawnFrames = false;
  /** Cards still flying when the trick result activated; judged a frame later (same-frame completion is fine). */
  private landedCheck: { t: number; cards: string[]; frame: number } | null = null;
  private lastT = 0;
  private readonly metricsTotals = { played: 0, collected: 0 };
  private frameCosts = 0;
  private frameCostSum = 0;
  private maxFrameCost = 0;
  private serverMessages = 0;
  private readonly render = new RunRenderLedger();
  private reactAtReady: ReactCommitTotals = NO_REACT_TOTALS;
  private reactAtEnd: ReactCommitTotals = NO_REACT_TOTALS;
  private readonly snapshots: SnapshotRecord[] = [];

  constructor(options: RecorderOptions = {}) {
    this.scene.motionChecks = options.motionChecks ?? true;
  }

  start(t: number): void {
    this.audit.rebase(t);
    this.lastT = t;
  }

  /** Re-bases reported times on the moment the scene finished loading; loading time is not animation time. */
  markReady(t: number, ready: ReadyState = {}): void {
    this.audit.rebase(t);
    this.render.markReady(ready.inventory ?? null);
    this.reactAtReady = ready.react ?? NO_REACT_TOTALS;
    this.reactAtEnd = this.reactAtReady;
    this.scene.ready = true;
    this.log(t, 'run', 'ready');
  }

  // --------------------------------------------------------------------------
  // Measurement windows and snapshots
  // --------------------------------------------------------------------------

  startWindow(t: number, label: string, react: ReactCommitTotals): void {
    this.render.windows.start(label, t, react);
    this.log(t, 'run', 'measure-start', { label });
  }

  /** False when no window of that name was open. */
  endWindow(t: number, label: string, react: ReactCommitTotals): boolean {
    this.log(t, 'run', 'measure-end', { label });
    return this.render.windows.end(label, t, react);
  }

  addSnapshot(snapshot: SnapshotRecord): void {
    this.snapshots.push(snapshot);
    this.log(snapshot.t, 'run', 'snapshot', { label: snapshot.label, held: snapshot.held });
  }

  snapshotList(): SnapshotRecord[] {
    return this.snapshots.map((snapshot) => ({ ...snapshot, t: this.audit.relative(snapshot.t) }));
  }

  lastRenderSample(): RenderSample | null {
    return this.render.lastSample();
  }

  /**
   * The canvas unmounted as a whole (game end, disconnect overlay). Its objects did not leave
   * one by one, so no handoff or stuck checks apply to them; a remount starts fresh.
   */
  sceneUnmounted(t: number): void {
    this.scene.clear();
    this.playedAnimating.clear();
    this.log(t, 'run', 'scene-unmounted');
  }

  countPresent(kind: SceneObjectKind): number {
    return this.scene.present(kind).length;
  }

  isAnimationInFlight(): boolean {
    return this.playedAnimating.size > 0 || this.countPresent('collecting-card') > 0 || this.scene.isTableMoving();
  }

  log(t: number, kind: TimelineKind, label: string, data?: Record<string, unknown>): void {
    this.audit.log(t, kind, label, data);
  }

  flag(t: number, code: AnomalyCode, message: string, subject?: string, data?: Record<string, unknown>): void {
    this.audit.flag(t, code, message, subject, data);
  }

  // --------------------------------------------------------------------------
  // Lifecycle events
  // --------------------------------------------------------------------------

  serverMessage(t: number, type: string, data: { cardId?: string; trickCardIds?: string[]; isLocalPlayer?: boolean } = {}): void {
    this.serverMessages++;
    // Card ids repeat every round (the deck is reshuffled), so per-card bookkeeping is per round.
    if (type === 'TRUMP_REVEALED') this.closeRound(t);
    if (type === 'CARD_PLAYED' && data.cardId) {
      this.announcedCards.add(data.cardId);
      if (data.isLocalPlayer) this.localCards.add(data.cardId);
    }
    if (type === 'TRICK_COMPLETE') {
      for (const cardId of data.trickCardIds ?? []) this.completedTrickCards.add(cardId);
    }
    if (type !== 'GAME_STATE') this.log(t, 'server', type, data.cardId ? { cardId: data.cardId } : undefined);
  }

  /** The player's own play, known from the input before the server echoes it (late on a slow network). */
  markLocalPlay(cardId: string): void {
    this.localCards.add(cardId);
  }

  playedAnimationComplete(t: number, cardId: string): void {
    this.playedAnimating.delete(cardId);
    if (!this.scene.present('played-card').some((track) => track.cardId === cardId)) this.restedPlays.add(cardId);
    this.log(t, 'client', 'played-animation-complete', { cardId });
  }

  cardLanded(t: number, cardId: string): void {
    if (this.landedCards.has(cardId)) this.flag(t, 'duplicate-land', `Landing feedback fired twice for ${cardId}`, cardId);
    this.landedCards.add(cardId);
    this.log(t, 'client', 'card-landed', { cardId });
  }

  allCardsLanded(t: number): void {
    const stillFlying = [...this.playedAnimating];
    if (stillFlying.length > 0) this.landedCheck = { t, cards: stillFlying, frame: this.audit.frame };
    this.allLandedForTrick = true;
    this.log(t, 'client', 'all-cards-landed');
  }

  trickCollectComplete(t: number): void {
    // Finished cards stay mounted until the completion re-renders the table; only moving ones are
    // premature. Speeds need every frame: a sparse (perf) sample of the last flight frames reads as moving.
    const moving = !this.scene.motionChecks ? [] : this.scene.present('collecting-card')
      .filter((track) => track.speed > SANDBOX_AUDIT.SETTLED_MAX_SPEED_UNITS_PER_S)
      .map((track) => track.cardId);
    if (moving.length > 0) {
      this.flag(t, 'premature-collect-complete', `Collection reported complete while ${moving.join(', ')} still flying`, moving[0], { moving });
    }
    this.allLandedForTrick = false;
    this.log(t, 'client', 'trick-collect-complete');
  }

  renderSample(sample: RenderSample): void {
    this.render.sample(sample);
    // A frame that drew nothing (a lost context): the next drawn one follows the last the player saw.
    if (sample.drawCalls === 0) this.undrawnFrames = true;
  }

  frameCost(ms: number): void {
    this.render.frameCost(ms);
    this.frameCosts++;
    this.frameCostSum += ms;
    this.maxFrameCost = Math.max(this.maxFrameCost, ms);
    if (ms > SANDBOX_AUDIT.SLOW_FRAME_COST_MS) {
      this.flag(this.lastT, 'slow-frame', `A frame took ${round(ms, 1)}ms of real time to process`, undefined, { costMs: round(ms, 1) });
    }
  }

  /** `samples` is null on frames the probe did not sample (perf mode); the frame still counts. */
  frame(t: number, samples: ObjectSample[] | null, context: FrameContext): void {
    this.audit.frame++;
    this.lastT = t;
    this.checkLandedActivation();
    if (samples && this.undrawnFrames) this.scene.breakContinuity();
    if (samples) this.scene.frame(t, samples, context);
    if (samples) this.undrawnFrames = false;
  }

  private checkLandedActivation(): void {
    const check = this.landedCheck;
    if (!check || this.audit.frame <= check.frame + 1) return;
    this.landedCheck = null;
    const stillFlying = check.cards.filter((cardId) => this.playedAnimating.has(cardId));
    if (stillFlying.length > 0) {
      this.flag(check.t, 'premature-all-landed', `Trick result activated while ${stillFlying.join(', ')} still animating`, stillFlying[0], { stillFlying });
    }
  }

  private onMount(t: number, sample: ObjectSample): void {
    if (sample.kind === 'played-card') {
      this.animatedCards.add(sample.cardId);
      // A card placed at rest (catch-up, the player's turn) shows the trick; it does not fly.
      if (this.restedPlays.delete(sample.cardId)) return;
      // Opponent cards fly one at a time; the player's own card starts at once and may overlap one.
      const others = [...this.playedAnimating].filter((cardId) => cardId !== sample.cardId && !this.localCards.has(cardId));
      if (others.length > 0 && !this.localCards.has(sample.cardId)) {
        this.flag(t, 'overlapping-play-animations', `${sample.cardId} started flying while ${others.join(', ')} had not landed`, sample.cardId, { others });
      }
      if (this.scene.remaining('collecting-card').some((track) => track.cardId !== sample.cardId)) {
        this.flag(t, 'trick-overlap', `${sample.cardId} entered the table while the previous trick was still being collected`, sample.cardId);
      }
      this.playedAnimating.add(sample.cardId);
    }

    if (sample.kind === 'collecting-card') {
      this.collectedCards.add(sample.cardId);
      if (!this.allLandedForTrick) {
        this.flag(t, 'collect-before-landed', `${sample.cardId} started collecting before the trick reported all cards landed`, sample.cardId);
      }
    }
  }

  private onUnmount(t: number, track: Track): void {
    if (track.kind === 'played-card' && this.playedAnimating.has(track.cardId)) {
      this.playedAnimating.delete(track.cardId);
      this.flag(t, 'skipped-play-animation', `${track.cardId} left the table before its play animation completed`, track.cardId);
    }
  }

  // --------------------------------------------------------------------------
  // Final checks
  // --------------------------------------------------------------------------

  finish(t: number, end: EndState, react: ReactCommitTotals = this.reactAtReady): void {
    this.reactAtEnd = react;
    this.render.windows.finish(t, react);
    this.checkEndState(t, end);

    for (const track of this.scene.present()) {
      if (TABLE_KINDS.has(track.kind) && track.speed > SANDBOX_AUDIT.SETTLED_MAX_SPEED_UNITS_PER_S) {
        this.flag(t, 'not-settled', `${track.name} still moves at ${round(track.speed, 2)} u/s after settling`, track.name);
      }
    }
    this.closeRound(t);
  }

  /** Judges the finished round's plays and collections, then forgets its card ids. */
  private closeRound(t: number): void {
    for (const cardId of this.announcedCards) {
      if (!this.animatedCards.has(cardId)) this.flag(t, 'skipped-play-animation', `${cardId} was played but never appeared on the table`, cardId);
    }
    for (const cardId of this.completedTrickCards) {
      if (!this.collectedCards.has(cardId)) this.flag(t, 'skipped-collection', `${cardId} belonged to a completed trick but was never collected`, cardId);
    }
    this.metricsTotals.played += this.animatedCards.size;
    this.metricsTotals.collected += this.collectedCards.size;
    for (const set of [this.announcedCards, this.animatedCards, this.collectedCards, this.completedTrickCards, this.landedCards, this.localCards, this.restedPlays]) set.clear();
  }

  private checkEndState(t: number, end: EndState): void {
    const collecting = this.scene.present('collecting-card');
    if (collecting.length > 0) {
      this.flag(t, 'collection-stuck', `${collecting.length} card(s) never finished collecting`, undefined, { cards: collecting.map((track) => track.cardId) });
    }
    if (end.trickResult || end.pendingTrickResult || end.isTrickAnimating) {
      this.flag(t, 'trick-state-stuck', 'Trick animation state never cleared', undefined, {
        trickResult: end.trickResult,
        pendingTrickResult: end.pendingTrickResult,
        isTrickAnimating: end.isTrickAnimating,
      });
    }
    if (end.handAnimation !== 'none') this.flag(t, 'hand-animation-stuck', `Hand animation "${end.handAnimation}" never finished`);

    const handCards = this.countPresent('hand-card');
    const handPhase = end.phase === 'PLAYING' || end.phase === 'BIDDING' || end.phase === 'TRUMP_SELECTION';
    if (handPhase && end.localHandSize !== null && handCards !== end.localHandSize) {
      this.flag(t, 'hand-count-mismatch', `Hand renders ${handCards} card(s) but the player holds ${end.localHandSize}`);
    }
  }

  anomalyList(): Anomaly[] {
    return this.audit.anomalyList();
  }

  timelineEntries(): TimelineEntry[] {
    return this.audit.timelineEntries(this.lastT);
  }

  metrics(): Omit<RunMetrics, 'wallDurationMs' | 'frameTiming'> {
    return {
      frames: this.audit.frame,
      virtualDurationMs: this.audit.relative(this.lastT),
      maxFrameCostMs: round(this.maxFrameCost, 1),
      meanFrameCostMs: this.frameCosts > 0 ? round(this.frameCostSum / this.frameCosts, 2) : 0,
      serverMessages: this.serverMessages,
      playedCardAnimations: this.metricsTotals.played + this.animatedCards.size,
      collectedCards: this.metricsTotals.collected + this.collectedCards.size,
      render: this.render.metrics(),
      react: reactTotalsBetween(this.reactAtReady, this.reactAtEnd),
      windows: this.render.windows.results(),
    };
  }
}
