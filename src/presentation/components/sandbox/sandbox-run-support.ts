import { CardType, getRoundCount } from '@shared/domain';
import { loadGameSettings, saveGameSettings } from '../settings';
import type { AnimationAuditRecorder, EndState } from './animation-audit-recorder';
import { SANDBOX_AUDIT, SANDBOX_DEFAULTS } from '../../config/sandbox.config';
import type {
  AuditReport,
  CardSelector,
  FrameTimingStats,
  RunEnvironment,
  SandboxClock,
  SandboxGameHandles,
  SandboxRunConfig,
  SandboxScenario,
  SandboxServer,
  SandboxServerFactory,
  SandboxSettings,
  SandboxStep,
  SandboxTableConfig,
  ScenarioRound,
} from './sandbox.types';

/** Ends a scenario early; the cause has already been recorded as an anomaly. */
export class StepAbort extends Error {}

type HandCard = SandboxGameHandles['localHand'][number];

const SPECIAL_SELECTORS: Record<string, (card: HandCard) => boolean> = {
  wizard: (card) => card.type === CardType.WIZARD,
  jester: (card) => card.type === CardType.JESTER,
  number: (card) => card.type === CardType.NUMBER,
};

/** Picks a playable card. 'random' derives from the frame number, so replays stay deterministic. */
export function selectPlayableCard(handles: SandboxGameHandles, selector: CardSelector = 'first', frame = 0): string {
  const playable = handles.localHand.filter((card) => handles.playableCardIds.includes(card.id));
  if (playable.length === 0) throw new Error('No playable card');

  const special = SPECIAL_SELECTORS[selector];
  if (special) return (playable.find(special) ?? playable[0]).id;
  if (selector === 'first') return playable[0].id;
  if (selector === 'last') return playable[playable.length - 1].id;
  if (selector === 'random') return playable[(frame * 7919) % playable.length].id;
  const exact = playable.find((card) => card.id === selector);
  if (!exact) throw new Error(`Card ${selector} is not playable`);
  return exact.id;
}

/** The round a scenario asks for: 'max' is the largest hand the table size allows. */
function resolveScenarioRound(round: ScenarioRound | undefined, playerCount: number): number {
  if (round === 'max') return getRoundCount(playerCount);
  return round ?? SANDBOX_DEFAULTS.ROUND;
}

export function buildSandboxTable(config: SandboxRunConfig, scenario: SandboxScenario): SandboxTableConfig {
  const playerCount = config.playerCount ?? SANDBOX_DEFAULTS.PLAYER_COUNT;
  const { round, ...table } = scenario.table ?? {};
  return {
    roomId: 'sandbox',
    playerCount,
    seed: config.seed ?? SANDBOX_DEFAULTS.SEED,
    leadSeat: 1,
    startPhase: 'PLAYING',
    ...table,
    round: resolveScenarioRound(round, playerCount),
  };
}

/**
 * Creates the run's loopback server with bots waiting until the client is loaded (like a player
 * joining a table that waits for them) and every delivered message traced into the recorder.
 */
export function createTracedServer(
  createServer: SandboxServerFactory,
  table: SandboxTableConfig,
  recorder: AnimationAuditRecorder,
  now: () => number
): SandboxServer {
  const server = createServer({
    table,
    bots: { mode: 'manual' },
    onTrace: (entry) => {
      if (entry.direction !== 'server-to-client') return;
      recorder.serverMessage(now(), entry.type, {
        cardId: entry.cardId,
        trickCardIds: entry.trickCardIds,
        isLocalPlayer: entry.playerId === server.localPlayerId,
      });
    },
  });
  return server;
}

export function describeStep(step: SandboxStep): string {
  switch (step.op) {
    case 'play': return `play ${step.card ?? 'first'} via ${step.via ?? 'double-tap'}${step.pointer && step.pointer !== 'auto' ? ` (${step.pointer})` : ''}`;
    case 'wait': return `wait ${step.ms}ms`;
    case 'wait-for': return `wait for ${step.until}`;
    case 'repeat': return `repeat x${step.times}`;
    case 'bots': return `bots ${step.mode}`;
    case 'bot-play': return `bot plays x${step.count ?? 1}`;
    case 'settings': return `settings ${JSON.stringify(step.patch)}`;
    case 'network': return `network ${step.latencyMs ?? 0}±${step.jitterMs ?? 0}ms`;
    case 'stall': return `stall ${step.ms}ms`;
    case 'snapshot':
    case 'external':
    case 'checkpoint':
    case 'measure-start':
    case 'measure-end': return `${step.op} ${step.label}`;
    case 'close-socket': return `close socket ${step.code}`;
    case 'state-burst': return `state burst x${step.count}`;
    case 'storage-fault': return `storage ${step.mode}`;
    case 'visibility': return `tab ${step.state}`;
    case 'social': return `${step.kind} burst x${step.count}`;
    default: return step.op;
  }
}

export function currentSandboxSettings(): SandboxSettings {
  const { cardTheme, tableTheme, theme, collectionAnimation, cardNumberSize } = loadGameSettings();
  return { cardTheme, tableTheme, theme, collectionAnimation, cardNumberSize };
}

/** Saves through the regular settings path, so every settings-changed listener reacts as in the game. */
export function applySettings(patch: Partial<SandboxSettings>): void {
  saveGameSettings({ ...loadGameSettings(), ...patch } as ReturnType<typeof loadGameSettings>);
}

/**
 * Records console.error, uncaught errors and unhandled rejections as anomalies (warnings go to
 * the timeline) for the duration of a run. Returns the restore function.
 */
export function captureConsole(
  recorder: () => AnimationAuditRecorder | null,
  now: () => number,
  phase: () => string
): () => void {
  const originalError = console.error;
  const originalWarn = console.warn;
  const text = (args: unknown[]) => args.map(String).join(' ');
  const stackOf = (args: unknown[]) => {
    const error = args.find((arg): arg is Error => arg instanceof Error);
    return error?.stack?.split('\n').slice(0, 4).join('\n');
  };

  console.error = (...args: unknown[]) => {
    recorder()?.flag(now(), 'console-error', text(args).slice(0, 400), text(args).slice(0, 80), { phase: phase(), stack: stackOf(args) });
    originalError(...args);
  };
  console.warn = (...args: unknown[]) => {
    recorder()?.log(now(), 'client', 'console.warn', { message: text(args).slice(0, 200) });
    originalWarn(...args);
  };
  const onError = (event: ErrorEvent) => {
    const message = event.error instanceof Error ? `${event.error.name}: ${event.error.message}` : event.message;
    recorder()?.flag(now(), 'page-error', message, message.slice(0, 80), { phase: phase(), stack: stackOf([event.error]) });
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    const message = String(event.reason instanceof Error ? event.reason.message : event.reason);
    recorder()?.flag(now(), 'page-error', `Unhandled rejection: ${message}`, message.slice(0, 80), { phase: phase(), stack: stackOf([event.reason]) });
  };
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  return () => {
    console.error = originalError;
    console.warn = originalWarn;
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}

/** Snapshot attached to wait timeouts, so a stuck run says what it was waiting on. */
export function describeRunState(
  handles: SandboxGameHandles | null,
  server: SandboxServer | null,
  recorder: AnimationAuditRecorder | null
): Record<string, unknown> {
  return {
    phase: handles?.phase,
    isLocalTurn: handles?.isLocalTurn,
    playable: handles?.playableCardIds.length,
    trickResult: handles?.trickResult,
    pendingTrickResult: handles?.pendingTrickResult,
    isTrickAnimating: handles?.isTrickAnimating,
    queuedPlayedCards: handles?.queuedPlayedCards,
    handAnimation: handles?.handAnimation,
    pendingDeliveries: server?.hasPendingDeliveries,
    botScheduled: server?.isBotTurnScheduled,
    collecting: recorder?.countPresent('collecting-card'),
    played: recorder?.countPresent('played-card'),
  };
}

export function endStateOf(handles: SandboxGameHandles | null): EndState {
  return {
    trickResult: handles?.trickResult ?? false,
    pendingTrickResult: handles?.pendingTrickResult ?? false,
    isTrickAnimating: handles?.isTrickAnimating ?? false,
    handAnimation: handles?.handAnimation ?? 'none',
    localHandSize: handles ? handles.localHand.length : null,
    phase: handles?.phase ?? null,
  };
}

/**
 * Virtual time keeps running while a mounted canvas draws nothing (Suspense fallback, remount
 * after a reconnect), and animations judged by elapsed time then jump. Flags each such stall
 * once; returns the unsubscribe function.
 */
export function watchRenderStalls(
  clock: SandboxClock,
  recorder: AnimationAuditRecorder,
  scene: { lastDrawnAt: () => number; isActive: () => boolean; phase: () => string }
): () => void {
  let stalled = false;
  return clock.onFrame((now) => {
    if (now - scene.lastDrawnAt() <= SANDBOX_AUDIT.MAX_RENDER_STALL_MS || !scene.isActive()) {
      stalled = false;
      return;
    }
    if (stalled) return;
    stalled = true;
    recorder.flag(now, 'render-stall', `The mounted scene drew no frame for over ${SANDBOX_AUDIT.MAX_RENDER_STALL_MS}ms while time advanced`, undefined, {
      phase: scene.phase(),
    });
  });
}

export function buildAuditReport({ runId, scenarioId, config, recorder, wallDurationMs, frameTiming, environment }: {
  runId: string;
  scenarioId: string;
  config: SandboxRunConfig;
  recorder: AnimationAuditRecorder;
  wallDurationMs: number;
  frameTiming?: FrameTimingStats;
  environment: RunEnvironment;
}): AuditReport {
  const anomalies = recorder.anomalyList();
  return {
    runId,
    scenario: scenarioId,
    config: {
      ...config,
      scenario: scenarioId,
      settings: currentSandboxSettings(),
      viewport: { width: window.innerWidth, height: window.innerHeight },
    },
    passed: !anomalies.some((anomaly) => anomaly.severity !== 'info'),
    anomalies,
    metrics: { ...recorder.metrics(), wallDurationMs, ...(frameTiming ? { frameTiming } : {}) },
    snapshots: recorder.snapshotList(),
    environment,
    timeline: recorder.timelineEntries(),
  };
}
