import { TELEMETRY_LIMITS, type AnyTelemetryEnvelope } from '../../shared/telemetry';
import type { AlarmChannel } from '../utils/alarm-multiplexer';
import { deliveryBackoffMs } from '../utils/http-delivery';
import type { TelemetryTransport } from './http-telemetry-transport';
import { INITIAL_TELEMETRY_CURSOR, type TelemetryCursor, type TelemetrySink } from './telemetry-recorder';

/** Subset of DurableObjectStorage used by the outbox. */
export interface OutboxStorage {
  get<T>(key: string): Promise<T | undefined>;
  put(entries: Record<string, unknown>): Promise<void>;
  list<T>(options: { prefix: string; limit: number }): Promise<Map<string, T>>;
  delete(keys: string[]): Promise<number>;
}

export interface DurableObjectOutboxOptions {
  storage: OutboxStorage;
  transport: TelemetryTransport;
  alarm: AlarmChannel;
  now?: () => number;
  log?: (entry: Record<string, unknown>) => void;
}

export const OUTBOX_KEYS = {
  CURSOR: 'telemetry:cursor',
  PENDING_PREFIX: 'telemetry:outbox:',
  DEAD_LETTER_PREFIX: 'telemetry:dead:',
} as const;

/** Debounce so the events of a fast sequence of moves travel in one request. */
const FLUSH_DELAY_MS = 1_000;
/** Alarm armed on append, in case the object is evicted before the debounced flush runs. */
const SAFETY_NET_MS = 60_000;

/** DurableObjectStorage.put/delete accept at most 128 keys per call. */
const MAX_KEYS_PER_CALL = 128;

function chunk<T>(items: T[], size = MAX_KEYS_PER_CALL): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function pendingKey(seq: number): string {
  // Zero padding keeps lexicographic key order equal to sequence order.
  return `${OUTBOX_KEYS.PENDING_PREFIX}${String(seq).padStart(15, '0')}`;
}

/**
 * Transactional outbox inside the Durable Object.
 *
 * Events are written to the room's own storage in the same turn as the game state, so recording
 * never waits on the network and nothing is lost when the ingest API is down. Delivery is
 * at-least-once and in sequence order; the consumer deduplicates by eventId.
 */
export class DurableObjectOutbox implements TelemetrySink {
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushing: Promise<void> | null = null;
  private consecutiveFailures = 0;
  /** Set by append, so a drain that is already past its last read does not drop new events. */
  private hasUnflushedAppends = false;
  private readonly now: () => number;
  private readonly log: (entry: Record<string, unknown>) => void;

  constructor(private readonly options: DurableObjectOutboxOptions) {
    this.now = options.now ?? Date.now;
    this.log = options.log ?? ((entry) => console.log(JSON.stringify(entry)));
  }

  async loadCursor(): Promise<TelemetryCursor> {
    const cursor = await this.options.storage.get<TelemetryCursor>(OUTBOX_KEYS.CURSOR);
    const pending = await this.options.storage.list({ prefix: OUTBOX_KEYS.PENDING_PREFIX, limit: 1 });
    // Resume delivery of anything left over from before a restart or deploy.
    if (pending.size > 0) await this.options.alarm.setAlarm(this.now());
    return cursor ?? INITIAL_TELEMETRY_CURSOR;
  }

  append(events: AnyTelemetryEnvelope[], cursor: TelemetryCursor): void {
    const entries: [string, unknown][] = events.map((event) => [pendingKey(event.seq), event]);
    entries.push([OUTBOX_KEYS.CURSOR, cursor]);
    // Unawaited writes issued in the same turn are coalesced into one atomic batch by the runtime,
    // and output gates hold outgoing messages until they are durable.
    for (const part of chunk(entries)) void this.options.storage.put(Object.fromEntries(part));
    this.hasUnflushedAppends = true;

    if (this.consecutiveFailures === 0) {
      void this.options.alarm.setAlarm(this.now() + SAFETY_NET_MS);
      this.scheduleFlush(FLUSH_DELAY_MS);
    }
  }

  /** Delivers everything pending. Concurrent callers share one in-flight run. */
  flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushing ??= this.drain().finally(() => {
      this.flushing = null;
      if (this.hasUnflushedAppends && this.consecutiveFailures === 0) {
        this.scheduleFlush(FLUSH_DELAY_MS);
      }
    });
    return this.flushing;
  }

  private scheduleFlush(delayMs: number): void {
    if (this.flushTimer || this.flushing) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, delayMs);
  }

  private async drain(): Promise<void> {
    const { storage, transport, alarm } = this.options;

    for (;;) {
      this.hasUnflushedAppends = false;
      const pending = await storage.list<AnyTelemetryEnvelope>({
        prefix: OUTBOX_KEYS.PENDING_PREFIX,
        limit: TELEMETRY_LIMITS.MAX_EVENTS_PER_BATCH,
      });
      if (pending.size === 0) {
        this.consecutiveFailures = 0;
        if (!this.hasUnflushedAppends) await alarm.deleteAlarm();
        return;
      }

      const keys = [...pending.keys()];
      const events = [...pending.values()];
      const result = await transport.send(events);

      if (result.status === 'retry') {
        this.consecutiveFailures++;
        const backoffMs = deliveryBackoffMs(this.consecutiveFailures);
        this.log({
          level: 'warn',
          msg: 'telemetry_delivery_failed',
          reason: result.reason,
          pending: events.length,
          firstSeq: events[0]?.seq,
          attempt: this.consecutiveFailures,
          retryInMs: backoffMs,
        });
        await alarm.setAlarm(this.now() + backoffMs);
        return;
      }

      if (result.status === 'rejected') {
        // Park the batch instead of blocking every later event behind it.
        this.log({
          level: 'error',
          msg: 'telemetry_batch_dead_lettered',
          reason: result.reason,
          count: events.length,
          firstSeq: events[0]?.seq,
          lastSeq: events.at(-1)?.seq,
        });
        const deadLetters = keys.map((key, i) => [
          key.replace(OUTBOX_KEYS.PENDING_PREFIX, OUTBOX_KEYS.DEAD_LETTER_PREFIX),
          events[i],
        ] as const);
        await Promise.all(chunk([...deadLetters]).map((part) => storage.put(Object.fromEntries(part))));
      }

      await Promise.all(chunk(keys).map((part) => storage.delete(part)));
      this.consecutiveFailures = 0;
    }
  }
}
