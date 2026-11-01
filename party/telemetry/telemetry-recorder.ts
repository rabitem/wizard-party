import { v7 as uuidv7 } from 'uuid';

import type { Game, GameEvent } from '../../shared/domain';
import {
  TELEMETRY_LIMITS,
  TELEMETRY_SCHEMA_VERSION,
  TelemetryEventType,
  boundedText,
  type AnyTelemetryEnvelope,
  type TelemetrySource,
} from '../../shared/telemetry';
import { telemetryFact, type AnyTelemetryFact } from './telemetry-fact';
import { mapDomainEvents } from './telemetry-mapper';
import { TelemetryRateLimiter, type SuppressionReport } from './telemetry-rate-limiter';

/** What triggered the work currently running inside the room. */
export interface TelemetryCause {
  source: TelemetrySource;
  /** Client-controlled values are accepted as unknown and bounded to what ingest accepts. */
  actorId?: unknown;
  commandType?: unknown;
  /** Client requestId when available; otherwise one is generated per cause. */
  correlationId?: unknown;
  /**
   * Who the rate limit charges for facts recorded under this cause (the connection id for client
   * traffic). Not part of the envelope. Falls back to the actor.
   */
  senderKey?: unknown;
}

/** Recorder state that must survive restarts so sequences stay gapless and games keep their id. */
export interface TelemetryCursor {
  seq: number;
  gameId: string | null;
  gameStartedAt: number | null;
}

export const INITIAL_TELEMETRY_CURSOR: TelemetryCursor = { seq: 0, gameId: null, gameStartedAt: null };

/** Durable destination for recorded events (see DurableObjectOutbox). */
export interface TelemetrySink {
  loadCursor(): Promise<TelemetryCursor>;
  /** Must persist envelopes and cursor atomically. */
  append(events: AnyTelemetryEnvelope[], cursor: TelemetryCursor): void;
}

/** Port used by the game server. Implementations: TelemetryRecorder, NOOP_TELEMETRY. */
export interface GameTelemetry {
  start(): Promise<void>;
  withCause<T>(cause: TelemetryCause, fn: () => T): T;
  /** Records the telemetry facts of domain events (see telemetry-mapper). */
  capture(events: readonly GameEvent[], game: Game): void;
  /** Records a server-side fact that has no domain event (connections, settings, rejections). */
  record(fact: AnyTelemetryFact, game: Game): void;
}

export const NOOP_TELEMETRY: GameTelemetry = {
  start: () => Promise.resolve(),
  withCause: (_cause, fn) => fn(),
  capture: () => undefined,
  record: () => undefined,
};

const { MAX_ENVELOPE_TEXT_LENGTH } = TELEMETRY_LIMITS;

export interface TelemetryRecorderOptions {
  roomId: string;
  serverVersion: string | null;
  sink: TelemetrySink;
  now?: () => number;
  generateId?: () => string;
}

interface ActiveCause {
  source: TelemetrySource;
  actorId: string | null;
  commandType: string | null;
  correlationId: string;
  senderKey: string | null;
}

function suppressedFact(report: SuppressionReport): AnyTelemetryFact {
  return telemetryFact(TelemetryEventType.TELEMETRY_SUPPRESSED, null, {
    factType: report.factType,
    scope: report.scope,
    senderKey: boundedText(report.senderKey, MAX_ENVELOPE_TEXT_LENGTH),
    suppressedCount: report.suppressedCount,
    windowMs: report.windowMs,
  });
}

/**
 * Turns domain events into ordered, correlated telemetry envelopes.
 *
 * Game handlers run synchronously inside the Durable Object, so the active cause can be tracked
 * with a plain stack instead of async context propagation.
 */
export class TelemetryRecorder implements GameTelemetry {
  private cursor: TelemetryCursor = INITIAL_TELEMETRY_CURSOR;
  private readonly causes: ActiveCause[] = [];
  private readonly now: () => number;
  private readonly generateId: () => string;
  /** Bounds client-triggerable facts (see TELEMETRY_RATE_LIMITS). */
  private readonly rateLimiter = new TelemetryRateLimiter();

  constructor(private readonly options: TelemetryRecorderOptions) {
    this.now = options.now ?? Date.now;
    this.generateId = options.generateId ?? uuidv7;
  }

  async start(): Promise<void> {
    this.cursor = await this.options.sink.loadCursor();
  }

  withCause<T>(cause: TelemetryCause, fn: () => T): T {
    const parent = this.causes.at(-1);
    const actorId = boundedText(cause.actorId, MAX_ENVELOPE_TEXT_LENGTH);
    this.causes.push({
      source: cause.source,
      actorId,
      commandType: boundedText(cause.commandType, MAX_ENVELOPE_TEXT_LENGTH),
      // Nested causes (a command that triggers a reconnect resume) stay in the parent's trace.
      correlationId:
        boundedText(cause.correlationId, MAX_ENVELOPE_TEXT_LENGTH) ?? parent?.correlationId ?? this.generateId(),
      senderKey: boundedText(cause.senderKey, MAX_ENVELOPE_TEXT_LENGTH) ?? actorId ?? parent?.senderKey ?? null,
    });
    try {
      return fn();
    } finally {
      this.causes.pop();
    }
  }

  capture(events: readonly GameEvent[], game: Game): void {
    this.emit(mapDomainEvents(events, game), game);
  }

  record(fact: AnyTelemetryFact, game: Game): void {
    this.emit([fact], game);
  }

  /** Applies the rate limit; suppression reports go before the fact that ended their window. */
  private admit(facts: readonly AnyTelemetryFact[], senderKey: string | null, now: number): AnyTelemetryFact[] {
    const admitted: AnyTelemetryFact[] = [];
    for (const fact of facts) {
      // A closed connection never sends again: report what it still had suppressed.
      if (fact.type === TelemetryEventType.CLIENT_DISCONNECTED && senderKey !== null) {
        admitted.push(...this.rateLimiter.release(senderKey).map(suppressedFact));
      }
      const admission = this.rateLimiter.admit(fact.type, senderKey, now);
      admitted.push(...admission.reports.map(suppressedFact));
      if (admission.admitted) admitted.push(fact);
    }
    return admitted;
  }

  private emit(facts: readonly AnyTelemetryFact[], game: Game): void {
    if (facts.length === 0) return;

    const cause = this.causes.at(-1) ?? {
      source: 'system' as const,
      actorId: null,
      commandType: null,
      correlationId: this.generateId(),
      senderKey: null,
    };
    const occurredAt = this.now();
    const mappedEvents = this.admit(facts, cause.senderKey, occurredAt);
    if (mappedEvents.length === 0) return;
    const envelopes: AnyTelemetryEnvelope[] = [];
    let cursor = this.cursor;

    const push = (event: (typeof mappedEvents)[number]) => {
      cursor = { ...cursor, seq: cursor.seq + 1 };
      envelopes.push({
        schemaVersion: TELEMETRY_SCHEMA_VERSION,
        eventId: this.generateId(),
        type: event.type,
        occurredAt,
        roomId: this.options.roomId,
        gameId: cursor.gameId,
        seq: cursor.seq,
        source: cause.source,
        // Bots and system triggers act through the domain; the event's own actor is more precise.
        actorId: boundedText(event.actorId, MAX_ENVELOPE_TEXT_LENGTH) ?? cause.actorId,
        correlationId: cause.correlationId,
        commandType: cause.commandType,
        round: game.currentRound > 0 ? game.currentRound : null,
        phase: game.phase,
        serverVersion: this.options.serverVersion,
        payload: event.payload,
      } as AnyTelemetryEnvelope);
    };

    for (const event of mappedEvents) {
      if (event.type === TelemetryEventType.GAME_STARTED) {
        if (cursor.gameId) {
          push({
            type: TelemetryEventType.GAME_ABANDONED,
            actorId: null,
            payload: { reason: 'superseded_by_new_game', durationMs: occurredAt - (cursor.gameStartedAt ?? occurredAt) },
          });
        }
        cursor = { ...cursor, gameId: this.generateId(), gameStartedAt: occurredAt };
      }

      if (event.type === TelemetryEventType.GAME_COMPLETED) {
        event.payload.durationMs = occurredAt - (cursor.gameStartedAt ?? occurredAt);
      }

      push(event);

      if (event.type === TelemetryEventType.GAME_COMPLETED) {
        cursor = { ...cursor, gameId: null, gameStartedAt: null };
      }
    }

    this.cursor = cursor;
    this.options.sink.append(envelopes, cursor);
  }
}
