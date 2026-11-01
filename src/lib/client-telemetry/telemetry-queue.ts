import { CLIENT_TELEMETRY_LIMITS, type AnyClientTelemetryEnvelope } from '@shared/telemetry';

/**
 * Sends one serialized batch. Fire-and-forget (client telemetry is at-most-once); returns false
 * only when the browser refused the request synchronously (e.g. keepalive quota exhausted), so
 * the queue can keep those events for a later flush.
 */
export type TelemetryTransport = (body: string) => boolean;

export interface TelemetryQueueOptions {
  transport: TelemetryTransport;
  now: () => number;
  /** Runs `flush` soon, outside the caller's stack (keeps `push` cheap on hot paths). */
  schedule: (task: () => void) => void;
  flushThreshold: number;
  maxBuffered: number;
  maxEventsPerBatch?: number;
  maxBodyBytes?: number;
  maxEventBytes?: number;
  /**
   * Total bytes handed to the transport by one flush. sendBeacon and fetch keepalive share one
   * per-document quota for in-flight bytes, so one flush must fit into it as a whole; whatever
   * does not fit stays buffered for the next flush.
   */
  maxFlushBytes?: number;
}

const encoder = new TextEncoder();
const byteLength = (text: string) => encoder.encode(text).byteLength;

/**
 * Single in-memory buffer for all client telemetry. `push` is O(1) and never serializes; `flush`
 * sends the oldest events in size-bounded batches up to the per-flush byte budget.
 */
export class TelemetryQueue {
  private buffer: AnyClientTelemetryEnvelope[] = [];
  private flushScheduled = false;
  private droppedCount = 0;
  /** Events left over by the previous flush; the size threshold counts only events added since. */
  private backlog = 0;
  private readonly maxEventsPerBatch: number;
  private readonly maxBodyBytes: number;
  private readonly maxEventBytes: number;
  private readonly maxFlushBytes: number;

  constructor(private readonly options: TelemetryQueueOptions) {
    this.maxEventsPerBatch = options.maxEventsPerBatch ?? CLIENT_TELEMETRY_LIMITS.MAX_EVENTS_PER_BATCH;
    this.maxBodyBytes = options.maxBodyBytes ?? CLIENT_TELEMETRY_LIMITS.MAX_BODY_BYTES;
    this.maxEventBytes = options.maxEventBytes ?? CLIENT_TELEMETRY_LIMITS.MAX_EVENT_BYTES;
    this.maxFlushBytes = Math.min(
      options.maxFlushBytes ?? CLIENT_TELEMETRY_LIMITS.MAX_BODY_BYTES,
      CLIENT_TELEMETRY_LIMITS.KEEPALIVE_QUOTA_BYTES
    );
  }

  get size(): number {
    return this.buffer.length;
  }

  /** Events lost to the buffer bound or the per-event size limit. */
  get dropped(): number {
    return this.droppedCount;
  }

  push(event: AnyClientTelemetryEnvelope): void {
    this.buffer.push(event);
    if (this.buffer.length > this.options.maxBuffered) {
      this.buffer.shift();
      this.droppedCount++;
      this.backlog = Math.max(0, this.backlog - 1);
    }
    if (this.buffer.length - this.backlog >= this.options.flushThreshold && !this.flushScheduled) {
      this.flushScheduled = true;
      this.options.schedule(() => this.flush());
    }
  }

  flush(): void {
    this.flushScheduled = false;
    if (this.buffer.length === 0) return;
    const events = this.buffer;
    this.buffer = [];

    const prefix = `{"sentAt":${this.options.now()},"events":[`;
    const suffix = ']}';
    const envelopeBytes = byteLength(prefix) + byteLength(suffix);
    const maxRequestBytes = Math.min(this.maxBodyBytes, this.maxFlushBytes);
    let budget = this.maxFlushBytes;
    let parts: string[] = [];
    let batch: AnyClientTelemetryEnvelope[] = [];
    let bytes = envelopeBytes;

    /** False when the browser refused the batch; its events are kept. */
    const send = (): boolean => {
      if (parts.length === 0) return true;
      if (!this.options.transport(`${prefix}${parts.join(',')}${suffix}`)) return false;
      budget -= bytes;
      parts = [];
      batch = [];
      bytes = envelopeBytes;
      return true;
    };

    let index = 0;
    let refused = false;
    for (; index < events.length; index++) {
      const event = events[index];
      const json = JSON.stringify(event);
      const size = byteLength(json);
      // An event that can never fit into one request (or one flush) would block the queue forever.
      if (size > this.maxEventBytes || envelopeBytes + size > maxRequestBytes) {
        this.droppedCount++;
        continue;
      }
      const separator = parts.length > 0 ? 1 : 0;
      if (parts.length >= this.maxEventsPerBatch || bytes + separator + size > this.maxBodyBytes) {
        if (!send()) {
          refused = true;
          break;
        }
      }
      const added = (parts.length > 0 ? 1 : 0) + size;
      if (bytes + added > budget) break;
      bytes += added;
      parts.push(json);
      batch.push(event);
    }
    if (!refused && !send()) refused = true;

    const remaining = refused ? [...batch, ...events.slice(index)] : events.slice(index);
    this.buffer = remaining;
    this.backlog = remaining.length;
  }

  /** Drops everything buffered (consent revoked). */
  clear(): void {
    this.buffer = [];
    this.backlog = 0;
  }
}
