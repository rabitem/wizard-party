/**
 * Deterministic browser clock for the animation sandbox.
 *
 * Replaces performance.now, Date.now, timers and requestAnimationFrame with a virtual
 * timeline that advances in fixed frame steps. Animation code (R3F useFrame, THREE.Clock,
 * setTimeout-based delays, drag velocity sampling) then sees identical timing on every
 * run, whatever the machine load, so replays are reproducible and frame counts exact.
 *
 * React keeps its real MessageChannel scheduler; the driver yields to the event loop
 * after every frame so commits and effects interleave with frames as in a browser.
 */

export const VIRTUAL_FRAME_MS = 1000 / 60;

type TimerCallback = (...args: unknown[]) => void;

interface ScheduledTimer {
  id: number;
  at: number;
  seq: number;
  callback: TimerCallback;
  args: unknown[];
  intervalMs: number | null;
}

interface RealApis {
  performanceNow: () => number;
  dateNow: () => number;
  setTimeout: typeof globalThis.setTimeout;
  clearTimeout: typeof globalThis.clearTimeout;
  setInterval: typeof globalThis.setInterval;
  clearInterval: typeof globalThis.clearInterval;
  requestAnimationFrame: typeof globalThis.requestAnimationFrame;
  cancelAnimationFrame: typeof globalThis.cancelAnimationFrame;
}

export type ClockMode = 'play' | 'paused' | 'fast';

export interface VirtualClockStats {
  now: number;
  frame: number;
  mode: ClockMode;
  speed: number;
  /** Real milliseconds the last frame took to process (scripts + render submission). */
  lastFrameCostMs: number;
  maxFrameCostMs: number;
}

type FrameListener = (now: number, frame: number) => void;

export class VirtualClock {
  private real: RealApis | null = null;
  private virtualNow = 0;
  private epochAtStart = 0;
  private frame = 0;
  private seq = 0;
  private nextId = 1;
  private readonly timers = new Map<number, ScheduledTimer>();
  private rafCallbacks = new Map<number, FrameRequestCallback>();
  private readonly frameListeners = new Set<FrameListener>();
  private mode: ClockMode = 'play';
  private speed = 1;
  private driverActive = false;
  private pendingFrames = 0;
  private lastFrameCostMs = 0;
  private maxFrameCostMs = 0;
  private yieldChannel: MessageChannel | null = null;
  private yieldResolvers: Array<() => void> = [];
  private wakeDriver: (() => void) | null = null;

  get installed(): boolean {
    return this.real !== null;
  }

  now(): number {
    return this.virtualNow;
  }

  realNow(): number {
    return this.real ? this.real.performanceNow() : performance.now();
  }

  install(): void {
    if (this.real || typeof window === 'undefined') return;
    const real: RealApis = {
      performanceNow: performance.now.bind(performance),
      dateNow: Date.now,
      setTimeout: window.setTimeout.bind(window) as typeof globalThis.setTimeout,
      clearTimeout: window.clearTimeout.bind(window) as typeof globalThis.clearTimeout,
      setInterval: window.setInterval.bind(window) as typeof globalThis.setInterval,
      clearInterval: window.clearInterval.bind(window) as typeof globalThis.clearInterval,
      requestAnimationFrame: window.requestAnimationFrame.bind(window),
      cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    };
    this.real = real;
    this.virtualNow = real.performanceNow();
    this.epochAtStart = real.dateNow() - this.virtualNow;

    const yieldChannel = new MessageChannel();
    yieldChannel.port1.onmessage = () => this.yieldResolvers.shift()?.();
    this.yieldChannel = yieldChannel;

    performance.now = () => this.virtualNow;
    Date.now = () => Math.round(this.epochAtStart + this.virtualNow);
    window.setTimeout = ((callback: TimerCallback, ms?: number, ...args: unknown[]) =>
      this.schedule(callback, ms ?? 0, args, null)) as unknown as typeof window.setTimeout;
    window.setInterval = ((callback: TimerCallback, ms?: number, ...args: unknown[]) =>
      this.schedule(callback, ms ?? 0, args, Math.max(1, ms ?? 0))) as unknown as typeof window.setInterval;
    window.clearTimeout = ((id?: number) => { if (id !== undefined) this.timers.delete(id); }) as typeof window.clearTimeout;
    window.clearInterval = window.clearTimeout as unknown as typeof window.clearInterval;
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      const id = this.nextId++;
      this.rafCallbacks.set(id, callback);
      return id;
    };
    window.cancelAnimationFrame = (id: number) => { this.rafCallbacks.delete(id); };

    this.startDriver();
  }

  setMode(mode: ClockMode, speed = this.speed): void {
    this.mode = mode;
    this.speed = Math.min(8, Math.max(0.125, speed));
    // A driver parked on a display frame (which never comes in a hidden tab) re-reads the mode.
    this.wakeDriver?.();
    this.startDriver();
  }

  stats(): VirtualClockStats {
    return {
      now: this.virtualNow,
      frame: this.frame,
      mode: this.mode,
      speed: this.speed,
      lastFrameCostMs: this.lastFrameCostMs,
      maxFrameCostMs: this.maxFrameCostMs,
    };
  }

  resetFrameCostStats(): void {
    this.maxFrameCostMs = 0;
  }

  onFrame(listener: FrameListener): () => void {
    this.frameListeners.add(listener);
    return () => this.frameListeners.delete(listener);
  }

  /** Real time passes, virtual time does not move: for holds while paused and waits on the driver. */
  realDelay(ms: number): Promise<void> {
    const realSetTimeout = this.real?.setTimeout ?? globalThis.setTimeout;
    return new Promise((resolve) => {
      realSetTimeout(resolve, ms);
    });
  }

  /** Runs exactly `count` frames, yielding to the event loop between them. Works while paused. */
  async step(count = 1): Promise<void> {
    for (let index = 0; index < count; index++) {
      this.tick();
      await this.yieldToEventLoop();
    }
  }

  /** Resolves once virtual time has advanced by `ms` (driven by the running driver, or by stepping when paused). */
  advance(ms: number): Promise<void> {
    const target = this.virtualNow + ms;
    return this.waitUntil(() => this.virtualNow >= target, Number.POSITIVE_INFINITY).then(() => undefined);
  }

  /**
   * Resolves true when `predicate` holds after a frame, or false once `timeoutMs` of virtual
   * time passed. While paused it steps frames itself so agents can drive time explicitly.
   */
  async waitUntil(predicate: () => boolean, timeoutMs: number): Promise<boolean> {
    if (predicate()) return true;
    const deadline = this.virtualNow + timeoutMs;

    if (!this.real) {
      return new Promise((resolve) => {
        const poll = () => {
          if (predicate()) return resolve(true);
          if (performance.now() >= deadline) return resolve(false);
          window.setTimeout(poll, VIRTUAL_FRAME_MS);
        };
        poll();
      });
    }

    return new Promise((resolve) => {
      const unsubscribe = this.onFrame((now) => {
        if (predicate()) {
          unsubscribe();
          resolve(true);
        } else if (now >= deadline) {
          unsubscribe();
          resolve(false);
        }
      });
      if (this.mode === 'paused') void this.stepWhile(() => this.frameListeners.size > 0);
    });
  }

  /**
   * Like waitUntil, but the timeout is real time. For waits on real-world work (chunk
   * loading, WASM, GPU uploads) that a fast-forwarding virtual clock would otherwise outrun.
   */
  async waitUntilReal(predicate: () => boolean, realTimeoutMs: number): Promise<boolean> {
    if (predicate()) return true;
    const deadline = this.realNow() + realTimeoutMs;
    return new Promise((resolve) => {
      const unsubscribe = this.onFrame(() => {
        if (predicate()) {
          unsubscribe();
          resolve(true);
        } else if (this.realNow() >= deadline) {
          unsubscribe();
          resolve(false);
        }
      });
      if (this.mode === 'paused') void this.stepWhile(() => this.frameListeners.size > 0);
    });
  }

  private async stepWhile(condition: () => boolean): Promise<void> {
    while (condition() && this.mode === 'paused') await this.step();
  }

  private schedule(callback: TimerCallback, ms: number, args: unknown[], intervalMs: number | null): number {
    const id = this.nextId++;
    this.timers.set(id, {
      id,
      at: this.virtualNow + Math.max(0, Number(ms) || 0),
      seq: this.seq++,
      callback,
      args,
      intervalMs,
    });
    return id;
  }

  private runDueTimers(): void {
    for (;;) {
      let next: ScheduledTimer | null = null;
      for (const timer of this.timers.values()) {
        if (timer.at > this.virtualNow) continue;
        if (!next || timer.at < next.at || (timer.at === next.at && timer.seq < next.seq)) next = timer;
      }
      if (!next) return;

      if (next.intervalMs === null) this.timers.delete(next.id);
      else {
        next.at += next.intervalMs;
        next.seq = this.seq++;
      }
      try {
        next.callback(...next.args);
      } catch (error) {
        console.error('[VirtualClock] timer callback failed', error);
      }
    }
  }

  private tick(): void {
    const real = this.real;
    if (!real) return;
    const startedAt = real.performanceNow();

    this.virtualNow += VIRTUAL_FRAME_MS;
    this.frame++;
    this.runDueTimers();

    const callbacks = this.rafCallbacks;
    this.rafCallbacks = new Map();
    for (const callback of callbacks.values()) {
      try {
        callback(this.virtualNow);
      } catch (error) {
        console.error('[VirtualClock] animation frame callback failed', error);
      }
    }

    for (const listener of [...this.frameListeners]) listener(this.virtualNow, this.frame);

    this.lastFrameCostMs = real.performanceNow() - startedAt;
    this.maxFrameCostMs = Math.max(this.maxFrameCostMs, this.lastFrameCostMs);
  }

  private yieldToEventLoop(): Promise<void> {
    return new Promise((resolve) => {
      this.yieldResolvers.push(resolve);
      this.yieldChannel?.port2.postMessage(null);
    });
  }

  /**
   * 'play' advances `speed` frames per real display frame (fixed steps, so timing stays
   * deterministic); 'fast' runs frames back to back as quickly as the page renders.
   */
  private startDriver(): void {
    const real = this.real;
    if (!real || this.driverActive || this.mode === 'paused') return;
    this.driverActive = true;

    const loop = async () => {
      while (this.mode !== 'paused') {
        if (this.mode === 'fast') {
          this.tick();
          await this.yieldToEventLoop();
          continue;
        }
        const woken = await new Promise<boolean>((resolve) => {
          this.wakeDriver = () => resolve(true);
          real.requestAnimationFrame(() => resolve(false));
        });
        this.wakeDriver = null;
        if (woken) continue;
        this.pendingFrames += this.speed;
        while (this.pendingFrames >= 1 && this.mode === 'play') {
          this.pendingFrames -= 1;
          this.tick();
          await this.yieldToEventLoop();
        }
      }
      this.driverActive = false;
    };
    void loop();
  }
}

/** One clock per page: the patched globals are process-wide. */
export const sandboxClock = new VirtualClock();
