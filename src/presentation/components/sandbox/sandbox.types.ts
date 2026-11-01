import type { Suit } from '@shared/domain';
import type { SceneObjectKind } from '../three/scene-object-names';
import type { GameSettings } from '../settings';
import type { GameSocketFactory } from '../../hooks/connection/game-socket';
import type { FrameTimingStats } from './sandbox-report.types';
import type { SandboxStep } from './sandbox-step.types';

export type * from './sandbox-step.types';
export type * from './sandbox-report.types';

export type Vec3 = [number, number, number];

export interface NdcBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** One probed scene object in one rendered frame. */
export interface ObjectSample {
  name: string;
  kind: SceneObjectKind;
  cardId: string;
  position: Vec3;
  /** Position in camera space; hand cards are parented to the camera, so they move in this frame. */
  cameraPosition: Vec3;
  /** World orientation as [x, y, z, w]. */
  quaternion: [number, number, number, number];
  scale: number;
  visible: boolean;
  finite: boolean;
  ndc: NdcBounds | null;
}

export type AnomalySeverity = 'error' | 'warn' | 'info';

export type AnomalyCode =
  | 'non-finite-transform'
  | 'teleport'
  | 'handoff-pop'
  | 'handoff-gap'
  | 'camera-jump'
  | 'render-stall'
  | 'path-kink'
  | 'rotation-pop'
  | 'double-render'
  | 'remount-flicker'
  | 'below-table'
  | 'hand-offscreen'
  | 'played-offscreen'
  | 'overlapping-play-animations'
  | 'premature-all-landed'
  | 'collect-before-landed'
  | 'premature-collect-complete'
  | 'trick-overlap'
  | 'duplicate-land'
  | 'skipped-play-animation'
  | 'skipped-collection'
  | 'not-settled'
  | 'collection-stuck'
  | 'trick-state-stuck'
  | 'hand-animation-stuck'
  | 'hand-count-mismatch'
  | 'wait-timeout'
  | 'step-failed'
  | 'console-error'
  | 'page-error'
  | 'hud-offscreen'
  | 'page-overflow'
  | 'slow-frame'
  // Playability (checkpoints and snapshots)
  | 'hud-overlap'
  | 'hud-occludes-scene'
  | 'tap-target-small'
  | 'scene-text-unreadable'
  | 'scene-occluded'
  | 'hand-translucent'
  | 'square-particles'
  // Environment and faults
  | 'webgl-unavailable'
  | 'software-renderer'
  | 'context-not-restored'
  | 'hold-timeout';

export interface Anomaly {
  code: AnomalyCode;
  severity: AnomalySeverity;
  /** Virtual ms since run start. */
  t: number;
  frame: number;
  message: string;
  subject?: string;
  count: number;
  data?: Record<string, unknown>;
}

export type TimelineKind =
  | 'run'
  | 'step'
  | 'server'
  | 'client'
  | 'mount'
  | 'unmount'
  | 'state';

export interface TimelineEntry {
  t: number;
  frame: number;
  kind: TimelineKind;
  label: string;
  data?: Record<string, unknown>;
}

export type SandboxSettings = Pick<GameSettings, 'cardTheme' | 'tableTheme' | 'theme' | 'collectionAnimation' | 'cardNumberSize'>;

/** 'max' deals the largest hand the table allows (60 cards / players): the layout's worst case. */
export type ScenarioRound = number | 'max';

export interface SandboxScenario {
  id: string;
  title: string;
  /** Which animations and interleavings the scenario exercises. */
  covers: string[];
  table?: Partial<Pick<SandboxTableConfig, 'leadSeat' | 'startPhase' | 'hands' | 'trumpSuit' | 'customRoundCount'>> & { round?: ScenarioRound };
  steps: SandboxStep[];
}

export interface SandboxRunConfig {
  id?: string;
  scenario: string | SandboxScenario;
  settings?: Partial<SandboxSettings>;
  playerCount?: number;
  seed?: number;
  settleMs?: number;
  /**
   * A driver is attached (Playwright, an agent): held snapshots wait for it to release them and
   * external steps hand it control. Without it both run straight through.
   */
  interactive?: boolean;
}

// ----------------------------------------------------------------------------
// Sandbox server port (implemented by src/infrastructure/sandbox)
// ----------------------------------------------------------------------------

export type SandboxStartPhase = 'TRUMP_SELECTION' | 'BIDDING' | 'PLAYING';

export interface SandboxTableConfig {
  roomId: string;
  /** 3-6 seats; seat 0 is always the local player. */
  playerCount: number;
  /** Round number, which decides the cards per player. */
  round: number;
  seed: number;
  /** Seat that leads the first trick (the dealer sits to its right). */
  leadSeat: number;
  startPhase: SandboxStartPhase;
  /** Exact card ids per seat, e.g. { 0: ['WIZARD-0', 'GIANTS-7'] }. Other seats are dealt normally. */
  hands?: Partial<Record<number, string[]>>;
  trumpSuit?: Suit | null;
  /** Shorter games, so the final round (and GAME_END) is reachable in one scenario. */
  customRoundCount?: number | null;
}

export interface SandboxNetworkConditions {
  /** One-way server -> client delay. Delivery order is preserved, as on a real WebSocket. */
  latencyMs: number;
  jitterMs: number;
}

export interface SandboxBotPacing {
  /** 'auto' schedules bots like the real server; 'manual' waits for playBot(). */
  mode: 'auto' | 'manual';
  delayMs: number;
}

export interface ServerTraceEntry {
  direction: 'server-to-client' | 'client-to-server';
  type: string;
  cardId?: string;
  /** Player who acted (CARD_PLAYED). */
  playerId?: string;
  trickCardIds?: string[];
}

export interface SandboxServerOptions {
  table: SandboxTableConfig;
  network?: Partial<SandboxNetworkConditions>;
  bots?: Partial<SandboxBotPacing>;
  onTrace?: (entry: ServerTraceEntry) => void;
}

export interface SandboxServer {
  readonly socketFactory: GameSocketFactory;
  readonly localPlayerId: string;
  readonly hasPendingDeliveries: boolean;
  readonly isBotTurnScheduled: boolean;
  readonly isConnected: boolean;
  setNetwork(network: Partial<SandboxNetworkConditions>): void;
  setBotPacing(bots: Partial<SandboxBotPacing>): void;
  stall(ms: number): void;
  dropConnection(): void;
  broadcastState(): void;
  playBot(): boolean;
  dispose(): void;
}

export type SandboxServerFactory = (options: SandboxServerOptions) => SandboxServer;

/**
 * Transport faults a client socket can be put through (implemented by the loopback socket).
 * Sockets that do not implement it are driven only through the SandboxServer port.
 */
export interface FaultableSocket {
  /** Server-initiated close with an application or protocol code (4000: superseded). */
  closeFromServer(code: number, reason: string): void;
  /** The connection attempt fails before it opens (offline, DNS, captive portal). */
  failToConnect(): void;
  /** Delivers a raw server message now, bypassing the server's queue (event bursts). */
  injectServerMessage(data: string): void;
}

// ----------------------------------------------------------------------------
// Ports the sandbox controller drives
// ----------------------------------------------------------------------------

/** Deterministic clock (implemented by src/infrastructure/sandbox/virtual-clock). */
export interface SandboxClock {
  now(): number;
  /** Real (wall) milliseconds, for measuring how long a run took to execute. */
  realNow(): number;
  waitUntil(predicate: () => boolean, timeoutMs: number): Promise<boolean>;
  /** Same, with a real-time timeout (for loading work the virtual clock would outrun). */
  waitUntilReal(predicate: () => boolean, realTimeoutMs: number): Promise<boolean>;
  advance(ms: number): Promise<void>;
  /** Resolves after `ms` of real time without driving any frame (holds while paused, driver waits). */
  realDelay(ms: number): Promise<void>;
  onFrame(listener: (now: number, frame: number) => void): () => void;
  step(count?: number): Promise<void>;
  setMode(mode: 'play' | 'paused' | 'fast', speed?: number): void;
  stats(): { now: number; frame: number; mode: 'play' | 'paused' | 'fast'; speed: number; lastFrameCostMs: number; maxFrameCostMs: number };
  resetFrameCostStats(): void;
  /** Real-time clocks report the browser's frame times since the last reset. */
  frameTiming?(): FrameTimingStats;
}

/** What the running game exposes to the sandbox: the same handlers the real UI calls. */
export interface SandboxGameHandles {
  isConnected: boolean;
  phase: string | null;
  localHand: Array<{ id: string; type: string; suit: string | null; value: number | null }>;
  playableCardIds: string[];
  isLocalTurn: boolean;
  forbiddenBid: number | null;
  trickResult: boolean;
  pendingTrickResult: boolean;
  isTrickAnimating: boolean;
  handAnimation: string;
  /** Cards of the current trick that the play sequencer has not released onto the table yet. */
  queuedPlayedCards: number;
  /** The other seats, for traffic sent in their name (emotes, chat). */
  opponents: Array<{ id: string; name: string }>;
  playCard(cardId: string): void;
  shuffle(): void;
  sort(): void;
  placeBid(bid: number): void;
  nextRound(): void;
  selectTrump(suit: Suit): void;
  /** "Play here": takes the seat back after the connection was superseded (it never reconnects by itself). */
  takeOverSeat(): void;
}

/** Lifecycle callbacks the game view reports, in the order the real client fires them. */
export interface SandboxLifecycleSink {
  cardLanded(cardId: string): void;
  allCardsLanded(): void;
  trickCollectComplete(): void;
  playedAnimationComplete(cardId: string): void;
  handAnimationProgress(progress: number): void;
}
