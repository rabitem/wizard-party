import type {
  AnyClientTelemetryEnvelope,
  ClientTelemetryEventType,
  ClientTelemetryPayloads,
} from '@shared/telemetry';

import { ErrorDeduper, toClientErrorPayload, type ClientErrorInput } from './error-report';
import { TelemetryQueue, type TelemetryTransport } from './telemetry-queue';

/** What collectors write to. Calls are no-ops while telemetry is disabled. */
export interface TelemetrySink {
  track<T extends ClientTelemetryEventType>(type: T, payload: ClientTelemetryPayloads[T]): void;
  reportError(input: ClientErrorInput): void;
  /** Sends buffered events now, e.g. for a final measurement reported while the page is hidden. */
  flush(): void;
}

/**
 * `global` collectors run whenever consent is given; scoped ones only while a component holds the
 * scope (e.g. `game` while the 3D table is mounted).
 */
export type CollectorScope = 'global' | 'game';

export interface ClientTelemetryCollector {
  name: string;
  scope: CollectorScope;
  /** Starts observing; returns the function that stops it and releases every listener. */
  start(sink: TelemetrySink): () => void;
}

export interface ClientTelemetryDeps {
  transport: TelemetryTransport;
  collectors: readonly ClientTelemetryCollector[];
  now: () => number;
  createEventId: () => string;
  getSessionId: () => string;
  getPage: () => string;
  appVersion: string;
  schedule: (task: () => void) => void;
  /** Repeating timer; returns its cancel function. */
  every: (task: () => void, intervalMs: number) => () => void;
  /** Called when the page is being hidden or unloaded; returns the unsubscribe function. */
  onPageHidden: (task: () => void) => () => void;
  flushIntervalMs: number;
  flushThreshold: number;
  maxBuffered: number;
  maxDistinctErrors: number;
}

/**
 * Consent-gated client telemetry. Nothing is observed, buffered or sent until `start()` (consent
 * granted); `stop()` (consent revoked) stops every collector and drops unsent events.
 */
export class ClientTelemetryClient implements TelemetrySink {
  private enabled = false;
  private sessionId: string | null = null;
  private playerId: string | null = null;
  private roomId: string | null = null;
  private readonly scopeHolders = new Map<CollectorScope, number>();
  private readonly running = new Map<ClientTelemetryCollector, () => void>();
  private teardown: (() => void)[] = [];
  private readonly queue: TelemetryQueue;
  private readonly errors: ErrorDeduper;

  constructor(private readonly deps: ClientTelemetryDeps) {
    this.queue = new TelemetryQueue({
      transport: deps.transport,
      now: deps.now,
      schedule: deps.schedule,
      flushThreshold: deps.flushThreshold,
      maxBuffered: deps.maxBuffered,
    });
    this.errors = new ErrorDeduper(deps.maxDistinctErrors);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  get bufferedEvents(): number {
    return this.queue.size;
  }

  start(): void {
    if (this.enabled) return;
    this.enabled = true;
    this.sessionId ??= this.deps.getSessionId();
    const flush = () => this.flush();
    // Hidden listeners registered after ours (web-vitals finalizes CLS/INP/LCP on the same event)
    // run after this one; the deferred second flush sends what they report before the page may
    // be frozen or discarded.
    const flushOnHide = () => {
      this.flush();
      this.deps.schedule(flush);
    };
    this.teardown = [this.deps.every(flush, this.deps.flushIntervalMs), this.deps.onPageHidden(flushOnHide)];
    this.reconcileCollectors();
  }

  stop(): void {
    if (!this.enabled) return;
    this.enabled = false;
    this.reconcileCollectors();
    for (const release of this.teardown) release();
    this.teardown = [];
    this.queue.clear();
  }

  setPlayerId(playerId: string | null): void {
    this.playerId = playerId || null;
  }

  setRoomId(roomId: string | null): void {
    this.roomId = roomId || null;
  }

  /** Holds a collector scope until the returned function is called. Re-entrant (ref counted). */
  enterScope(scope: Exclude<CollectorScope, 'global'>): () => void {
    this.scopeHolders.set(scope, (this.scopeHolders.get(scope) ?? 0) + 1);
    this.reconcileCollectors();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.scopeHolders.set(scope, Math.max(0, (this.scopeHolders.get(scope) ?? 0) - 1));
      this.reconcileCollectors();
    };
  }

  track<T extends ClientTelemetryEventType>(type: T, payload: ClientTelemetryPayloads[T]): void {
    if (!this.enabled || !this.sessionId) return;
    this.queue.push({
      eventId: this.deps.createEventId(),
      type,
      occurredAt: this.deps.now(),
      sessionId: this.sessionId,
      playerId: this.playerId,
      roomId: this.roomId,
      page: this.deps.getPage(),
      appVersion: this.deps.appVersion,
      payload,
    } as AnyClientTelemetryEnvelope);
  }

  reportError(input: ClientErrorInput): void {
    if (!this.enabled) return;
    const payload = toClientErrorPayload(input);
    if (this.errors.admit(payload)) this.track('error', payload);
  }

  flush(): void {
    this.queue.flush();
  }

  private shouldRun(collector: ClientTelemetryCollector): boolean {
    if (!this.enabled) return false;
    return collector.scope === 'global' || (this.scopeHolders.get(collector.scope) ?? 0) > 0;
  }

  private reconcileCollectors(): void {
    for (const collector of this.deps.collectors) {
      const stopCollector = this.running.get(collector);
      const shouldRun = this.shouldRun(collector);
      if (shouldRun && !stopCollector) {
        this.startCollector(collector);
      } else if (!shouldRun && stopCollector) {
        this.running.delete(collector);
        stopCollector();
      }
    }
  }

  private startCollector(collector: ClientTelemetryCollector): void {
    try {
      this.running.set(collector, collector.start(this));
    } catch (error) {
      // Telemetry must never break the app; a collector that cannot start is simply skipped.
      console.warn(`[ClientTelemetry] collector ${collector.name} failed to start`, error);
    }
  }
}
