import { GRAPHICS_LIFECYCLE } from '@/presentation/config/render-quality.config';

/**
 * - ready: the canvas is mounted and rendering
 * - lost: the GPU context is lost; the scene stays mounted (paused) waiting for webglcontextrestored
 * - rebuilding: no restore arrived (or the canvas crashed); a fresh canvas mounts after a back-off
 * - failed: rebuilds keep failing; the player can retry manually
 * - unavailable: this browser cannot create a WebGL2 context at all
 */
export type GraphicsStatus = 'ready' | 'lost' | 'rebuilding' | 'failed' | 'unavailable';

export interface GraphicsLifecycleState {
  status: GraphicsStatus;
  /** Key of the Canvas element; bumping it builds a new renderer and scene */
  canvasKey: number;
  /** Rebuilds since the last successfully rendered frame */
  attempts: number;
}

export type GraphicsLifecycleEvent =
  | { type: 'context-lost' }
  | { type: 'context-restored' }
  | { type: 'restore-timeout' }
  | { type: 'render-error' }
  | { type: 'rebuild' }
  | { type: 'frame-rendered' }
  | { type: 'manual-retry' };

type LifecycleConfig = typeof GRAPHICS_LIFECYCLE;

export function initialGraphicsLifecycle(webgl2Available: boolean): GraphicsLifecycleState {
  return { status: webgl2Available ? 'ready' : 'unavailable', canvasKey: 0, attempts: 0 };
}

/** Back-off before rebuild number `attempts + 1`. */
export function rebuildDelayMs(attempts: number, config: LifecycleConfig = GRAPHICS_LIFECYCLE): number {
  const delay = config.REBUILD_BASE_DELAY_MS * config.REBUILD_BACKOFF_FACTOR ** attempts;
  return Math.min(config.REBUILD_MAX_DELAY_MS, delay);
}

function scheduleRebuild(state: GraphicsLifecycleState, config: LifecycleConfig): GraphicsLifecycleState {
  return { ...state, status: state.attempts >= config.MAX_REBUILD_ATTEMPTS ? 'failed' : 'rebuilding' };
}

/** Pure transition function of the graphics lifecycle (unit tested). */
export function graphicsLifecycleReducer(
  state: GraphicsLifecycleState,
  event: GraphicsLifecycleEvent,
  config: LifecycleConfig = GRAPHICS_LIFECYCLE,
): GraphicsLifecycleState {
  switch (event.type) {
    case 'context-lost':
      return state.status === 'ready' ? { ...state, status: 'lost' } : state;
    case 'context-restored':
      return state.status === 'lost' ? { ...state, status: 'ready' } : state;
    case 'restore-timeout':
      return state.status === 'lost' ? scheduleRebuild(state, config) : state;
    case 'render-error':
      return state.status === 'ready' || state.status === 'lost' ? scheduleRebuild(state, config) : state;
    case 'rebuild':
      return state.status === 'rebuilding'
        ? { status: 'ready', canvasKey: state.canvasKey + 1, attempts: state.attempts + 1 }
        : state;
    case 'frame-rendered':
      return state.status === 'ready' && state.attempts > 0 ? { ...state, attempts: 0 } : state;
    case 'manual-retry':
      return state.status === 'unavailable' ? state : { status: 'ready', canvasKey: state.canvasKey + 1, attempts: 0 };
    default:
      return state;
  }
}
