import { FRAME_SCHEDULING } from '@/presentation/config/render-quality.config';

/** Returns true while its source needs full-rate frames (e.g. awake physics bodies). */
export type ActivityProbe = () => boolean;

/** Called with the interval between two consecutive full-rate frames (frame-time governor). */
export type ContinuousFrameListener = (intervalMs: number, now: number) => void;

/**
 * Knows whether the table needs full-rate frames. Sources of activity:
 * - holds: an animation that runs for an unknown time (useRenderActivity(true));
 * - pulses: a window of full-rate frames after input, a state change or a mount;
 * - probes: polled once per frame (awake rigid bodies);
 * - scene motion found by the SceneMotionMonitor after the frame rendered (passed to endFrame()).
 * Without activity the FrameScheduler renders at the ambient rate, and shadows are only
 * re-rendered on active frames or on request, so an idle table costs almost nothing.
 *
 * Framework free (the FrameScheduler component binds it to R3F's invalidate) and unit tested.
 */
export class RenderScheduler {
  private holds = 0;
  private activeUntil = 0;
  private shadowDirty = true;
  private wake: (() => void) | null = null;
  private lastFrameAt: number | null = null;
  private lastFrameContinuous = false;
  private readonly probes = new Set<ActivityProbe>();
  private readonly frameListeners = new Set<ContinuousFrameListener>();

  /** Connects the scheduler to the renderer's "render a frame soon" call. Returns the unbind. */
  bind(wake: () => void): () => void {
    this.wake = wake;
    return () => {
      if (this.wake === wake) this.wake = null;
    };
  }

  /** Full-rate frames until the returned release is called (idempotent). */
  hold(): () => void {
    this.holds++;
    this.wake?.();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.holds = Math.max(0, this.holds - 1);
    };
  }

  /** Full-rate frames for the next `durationMs`, starting with a frame right away. */
  pulse(durationMs: number, now: number = performance.now()): void {
    const wasActive = this.hasTimedActivity(now);
    this.activeUntil = Math.max(this.activeUntil, now + durationMs);
    if (!wasActive) this.wake?.();
  }

  /** Ask for one shadow map render (a caster moved, or the shadow map was reallocated). */
  requestShadowUpdate(): void {
    this.shadowDirty = true;
    this.wake?.();
  }

  addProbe(probe: ActivityProbe): () => void {
    this.probes.add(probe);
    this.wake?.();
    return () => {
      this.probes.delete(probe);
    };
  }

  onContinuousFrame(listener: ContinuousFrameListener): () => void {
    this.frameListeners.add(listener);
    return () => {
      this.frameListeners.delete(listener);
    };
  }

  /** Whether anything other than scene motion currently wants full-rate frames. */
  isActive(now: number = performance.now()): boolean {
    if (this.hasTimedActivity(now)) return true;
    for (const probe of this.probes) {
      if (probe()) return true;
    }
    return false;
  }

  /**
   * Start of a rendered frame, before the scene's frame callbacks. Reports the interval to the
   * frame-time listeners when this frame followed a full-rate one, and says whether the shadow
   * map must be re-rendered: on active frames, on the frame after motion (so casters are shadowed
   * at their final pose) and on request.
   */
  beginFrame(now: number): { updateShadows: boolean } {
    if (this.lastFrameContinuous && this.lastFrameAt !== null) {
      const interval = now - this.lastFrameAt;
      this.frameListeners.forEach((listener) => listener(interval, now));
    }
    this.lastFrameAt = now;
    const updateShadows = this.shadowDirty || this.lastFrameContinuous || this.isActive(now);
    this.shadowDirty = false;
    return { updateShadows };
  }

  /**
   * End of a rendered frame, with whether the scene moved during it. Returns whether the next
   * frame should follow on the next animation frame (otherwise at the ambient rate).
   */
  endFrame(now: number, sceneMoving: boolean): boolean {
    const continuous = sceneMoving || this.isActive(now);
    this.lastFrameContinuous = continuous;
    return continuous;
  }

  /** Forget frame timing (tab hidden, context lost): the next interval is not a frame time. */
  resetTiming(): void {
    this.lastFrameAt = null;
    this.lastFrameContinuous = false;
  }

  private hasTimedActivity(now: number): boolean {
    return this.holds > 0 || now < this.activeUntil;
  }
}

/** Used outside a FrameScheduler (tests, previews): every call is a harmless no-op. */
export const INERT_RENDER_SCHEDULER = new RenderScheduler();

/** Idle frame interval in ms: the tier's ambient rate, lowered for reduced motion, never 0 fps. */
export function ambientIntervalMs(ambientFps: number, reducedMotion: boolean): number {
  const fps = reducedMotion ? Math.min(ambientFps, FRAME_SCHEDULING.REDUCED_MOTION_AMBIENT_FPS) : ambientFps;
  return 1000 / Math.max(fps, FRAME_SCHEDULING.MIN_AMBIENT_FPS);
}
