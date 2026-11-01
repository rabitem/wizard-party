import {
  TelemetryEventType,
  TelemetrySuppressionScope,
} from '../../shared/telemetry';

/**
 * Bounds how many client-triggerable facts a room records, so anonymous or spamming clients cannot
 * turn every WebSocket message into a stored row (each one costs a Durable Object write, an ingest
 * call and a Postgres row).
 *
 * Fixed windows per (fact type, sender) and per (fact type, room). Dropped facts are not lost
 * silently: once a window has passed (or the sender disconnects), one SuppressionReport carries
 * how many were dropped. Fact types without a policy are never limited — game moves stay complete.
 */

export interface RateLimitPolicy {
  /** Max facts per sender (connection, else actor) and window; omit for room-wide facts only. */
  perSender?: number;
  /** Max facts for the whole room and window, so rotating senders cannot bypass `perSender`. */
  perRoom: number;
}

export const TELEMETRY_RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * Far above legitimate use: a room holds at most a handful of players, the client throttles emotes
 * and chat, and a well-behaved client hardly ever has a command rejected.
 */
export const TELEMETRY_RATE_LIMITS: Readonly<Partial<Record<TelemetryEventType, RateLimitPolicy>>> = {
  [TelemetryEventType.COMMAND_REJECTED]: { perSender: 20, perRoom: 120 },
  [TelemetryEventType.CHAT_SENT]: { perSender: 30, perRoom: 120 },
  [TelemetryEventType.EMOTE_SENT]: { perSender: 30, perRoom: 120 },
  // Connect/close churn opens a new connection id each time, so only a room-wide budget helps.
  [TelemetryEventType.CLIENT_CONNECTED]: { perRoom: 120 },
  [TelemetryEventType.CLIENT_DISCONNECTED]: { perRoom: 120 },
};

/** Bounds the limiter's memory if senders are never released (e.g. lost close events). */
export const MAX_RATE_LIMITED_SENDERS = 1_000;

export interface SuppressionReport {
  factType: TelemetryEventType;
  scope: TelemetrySuppressionScope;
  senderKey: string | null;
  suppressedCount: number;
  windowMs: number;
}

export interface Admission {
  admitted: boolean;
  /** Suppressions of windows that just ended; to be recorded before the fact itself. */
  reports: SuppressionReport[];
}

interface Window {
  factType: TelemetryEventType;
  senderKey: string | null;
  startedAt: number;
  count: number;
  suppressed: number;
}

/** Applies TELEMETRY_RATE_LIMITS in windows of TELEMETRY_RATE_LIMIT_WINDOW_MS. */
export class TelemetryRateLimiter {
  private readonly windowMs = TELEMETRY_RATE_LIMIT_WINDOW_MS;
  private readonly roomWindows = new Map<TelemetryEventType, Window>();
  /** sender key -> fact type -> window; insertion order is used for eviction. */
  private readonly senderWindows = new Map<string, Map<TelemetryEventType, Window>>();

  admit(factType: TelemetryEventType, senderKey: string | null, now: number): Admission {
    const policy = TELEMETRY_RATE_LIMITS[factType];
    if (!policy) return { admitted: true, reports: [] };

    const reports: SuppressionReport[] = [];
    const roomWindow = this.current(this.roomWindow(factType, now), now, reports);
    const senderWindow = policy.perSender !== undefined && senderKey !== null
      ? this.current(this.senderWindow(factType, senderKey, now), now, reports)
      : null;

    if (senderWindow && senderWindow.count >= (policy.perSender ?? 0)) {
      senderWindow.suppressed++;
      return { admitted: false, reports };
    }
    if (roomWindow.count >= policy.perRoom) {
      roomWindow.suppressed++;
      return { admitted: false, reports };
    }
    roomWindow.count++;
    if (senderWindow) senderWindow.count++;
    return { admitted: true, reports };
  }

  /** Forgets a sender (its connection closed) and reports what it still had suppressed. */
  release(senderKey: string): SuppressionReport[] {
    const windows = this.senderWindows.get(senderKey);
    this.senderWindows.delete(senderKey);
    return windows ? [...windows.values()].flatMap((window) => this.report(window, TelemetrySuppressionScope.SENDER)) : [];
  }

  private roomWindow(factType: TelemetryEventType, now: number): Window {
    let window = this.roomWindows.get(factType);
    if (!window) {
      window = newWindow(factType, null, now);
      this.roomWindows.set(factType, window);
    }
    return window;
  }

  private senderWindow(factType: TelemetryEventType, senderKey: string, now: number): Window {
    let windows = this.senderWindows.get(senderKey);
    if (!windows) {
      while (this.senderWindows.size >= MAX_RATE_LIMITED_SENDERS) {
        const oldest = this.senderWindows.keys().next();
        if (oldest.done) break;
        this.senderWindows.delete(oldest.value);
      }
      windows = new Map();
      this.senderWindows.set(senderKey, windows);
    }
    let window = windows.get(factType);
    if (!window) {
      window = newWindow(factType, senderKey, now);
      windows.set(factType, window);
    }
    return window;
  }

  /** Starts a new window when the current one has passed, reporting what it suppressed. */
  private current(window: Window, now: number, reports: SuppressionReport[]): Window {
    if (now - window.startedAt < this.windowMs) return window;
    const scope = window.senderKey === null ? TelemetrySuppressionScope.ROOM : TelemetrySuppressionScope.SENDER;
    reports.push(...this.report(window, scope));
    window.startedAt = now;
    window.count = 0;
    window.suppressed = 0;
    return window;
  }

  private report(window: Window, scope: TelemetrySuppressionScope): SuppressionReport[] {
    if (window.suppressed === 0) return [];
    return [{
      factType: window.factType,
      scope,
      senderKey: window.senderKey,
      suppressedCount: window.suppressed,
      windowMs: this.windowMs,
    }];
  }
}

function newWindow(factType: TelemetryEventType, senderKey: string | null, now: number): Window {
  return { factType, senderKey, startedAt: now, count: 0, suppressed: 0 };
}
