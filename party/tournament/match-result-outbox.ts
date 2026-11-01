import type { MatchReportOutcome } from '../../shared/domain/tournament';
import type { MatchProgressReport, MatchResultReport } from '../../shared/tournament';
import type { OutboxStorage } from '../telemetry';
import type { AlarmChannel } from '../utils/alarm-multiplexer';
import { deliveryBackoffMs } from '../utils/http-delivery';
import type { MatchResultTransport } from './http-match-result-transport';
import { MATCH_RESULT_OUTBOX } from './match-room.constants';

/** What the server made of a result it answered for good (recorded, superseded, ... or rejected), for the room that played it. */
export interface DeliveredMatchResult {
  matchId: string;
  outcome: MatchReportOutcome;
}

export type MatchResultOutcomeListener = (delivered: DeliveredMatchResult) => void;

/** Port: where the controller hands a finished match's report and its progress. Must not block or throw. */
export interface MatchResultSink {
  enqueue(report: MatchResultReport): void;
  /**
   * Proof of life of a match in play. Coalesced: the newest ping of a match replaces one not sent
   * yet, and none is sent once the match's result was enqueued.
   */
  enqueueProgress(ping: MatchProgressReport): void;
  /** Sets the one listener told what the server made of each result it answered for good (the room's controller). */
  onResultDelivered(listener: MatchResultOutcomeListener): void;
}

export interface MatchResultOutboxOptions {
  storage: OutboxStorage;
  transport: MatchResultTransport;
  alarm: AlarmChannel;
  now?: () => number;
  log?: (entry: Record<string, unknown>) => void;
}

function pendingKey(matchId: string): string {
  return `${MATCH_RESULT_OUTBOX.PENDING_PREFIX}${matchId}`;
}

function progressKey(matchId: string): string {
  return `${MATCH_RESULT_OUTBOX.PROGRESS_PREFIX}${matchId}`;
}

/**
 * Transactional outbox for match results, the sibling of the telemetry DurableObjectOutbox.
 *
 * The report is written to the room's storage in the same turn as the match lock is marked
 * reported, so a result is never lost to a crash or an unreachable server. Delivery is
 * at-least-once with exponential backoff on the alarm channel; the server records each match
 * once and its answer (recorded, superseded, ...) goes to the listener. Reports the server will
 * never accept are parked under the dead-letter prefix (and the listener hears 'rejected').
 *
 * Progress pings ride along at a lower priority: at most one per match is stored, they are sent
 * only while no result waits, and a refused ping is dropped (never parked). A failing ping backs
 * off on its own counter: it never holds back a result enqueued meanwhile.
 */
export class MatchResultOutbox implements MatchResultSink {
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushing: Promise<void> | null = null;
  /** Failed result deliveries in a row: while > 0 everything waits for the alarm. */
  private consecutiveFailures = 0;
  /** Failed ping deliveries in a row: while > 0 new pings wait for the alarm (results do not). */
  private pingFailures = 0;
  private hasUnflushedAppends = false;
  private listener: MatchResultOutcomeListener | null = null;
  /** Matches whose result was enqueued by this instance: their pings are over. */
  private readonly reported = new Set<string>();
  private readonly now: () => number;
  private readonly log: (entry: Record<string, unknown>) => void;

  constructor(private readonly options: MatchResultOutboxOptions) {
    this.now = options.now ?? (() => Date.now());
    this.log = options.log ?? ((entry) => console.log(JSON.stringify(entry)));
  }

  /** Resumes delivery of reports left over from before a restart or deploy (call from onStart). */
  async resume(): Promise<void> {
    const { storage, alarm } = this.options;
    const [results, pings] = await Promise.all([
      storage.list({ prefix: MATCH_RESULT_OUTBOX.PENDING_PREFIX, limit: 1 }),
      storage.list({ prefix: MATCH_RESULT_OUTBOX.PROGRESS_PREFIX, limit: 1 }),
    ]);
    if (results.size > 0 || pings.size > 0) await alarm.setAlarm(this.now());
  }

  enqueue(report: MatchResultReport): void {
    this.reported.add(report.mid);
    // Unawaited writes of one turn are coalesced into one atomic batch by the runtime: the result
    // and the removal of a ping of its match still waiting land together.
    void this.options.storage.delete([progressKey(report.mid)]);
    void this.options.storage.put({ [pendingKey(report.mid)]: report });
    this.scheduleDelivery();
  }

  enqueueProgress(ping: MatchProgressReport): void {
    if (this.reported.has(ping.mid)) return;
    void this.options.storage.put({ [progressKey(ping.mid)]: ping });
    // Backing off: the armed alarm (or the next result's flush) takes the stored ping along.
    if (this.pingFailures === 0) this.scheduleDelivery();
  }

  onResultDelivered(listener: MatchResultOutcomeListener): void {
    this.listener = listener;
  }

  /** Delivers everything pending. Concurrent callers share one in-flight run. */
  flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushing ??= this.drain().finally(() => {
      this.flushing = null;
      if (this.hasUnflushedAppends && this.consecutiveFailures === 0) this.scheduleFlush();
    });
    return this.flushing;
  }

  private scheduleDelivery(): void {
    this.hasUnflushedAppends = true;
    if (this.consecutiveFailures > 0) return;
    void this.options.alarm.setAlarm(this.now() + MATCH_RESULT_OUTBOX.SAFETY_NET_MS);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushTimer || this.flushing) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, 0);
  }

  private list<T>(prefix: string): Promise<Map<string, T>> {
    return this.options.storage.list<T>({ prefix, limit: MATCH_RESULT_OUTBOX.BATCH_LIMIT });
  }

  /** Results first; pings only while no result waits, so a ping never delays or overtakes one. */
  private async drain(): Promise<void> {
    for (;;) {
      this.hasUnflushedAppends = false;
      const results = await this.list<MatchResultReport>(MATCH_RESULT_OUTBOX.PENDING_PREFIX);
      if (results.size > 0) {
        for (const [key, report] of results) {
          if (!(await this.deliverResult(key, report))) return;
        }
        continue;
      }
      const pings = await this.list<MatchProgressReport>(MATCH_RESULT_OUTBOX.PROGRESS_PREFIX);
      if (pings.size === 0) {
        this.consecutiveFailures = 0;
        this.pingFailures = 0;
        if (!this.hasUnflushedAppends) await this.options.alarm.deleteAlarm();
        return;
      }
      for (const key of pings.keys()) {
        // Something was enqueued meanwhile (maybe a result): look again from the top.
        if (this.hasUnflushedAppends) break;
        if (!(await this.deliverProgress(key))) return;
      }
    }
  }

  /** False when delivery should stop for now (backoff armed). */
  private async deliverResult(key: string, report: MatchResultReport): Promise<boolean> {
    const result = await this.options.transport.send(report);
    if (result.status === 'retry') {
      this.consecutiveFailures++;
      return this.backOff('tournament_result_delivery_failed', report.mid, result.reason, this.consecutiveFailures);
    }

    if (result.status === 'rejected') {
      this.log({ level: 'error', msg: 'tournament_result_dead_lettered', matchId: report.mid, reason: result.reason });
      await this.options.storage.put({ [key.replace(MATCH_RESULT_OUTBOX.PENDING_PREFIX, MATCH_RESULT_OUTBOX.DEAD_LETTER_PREFIX)]: report });
    } else {
      const superseded = result.outcome === 'superseded';
      this.log({
        level: superseded ? 'warn' : 'info',
        msg: superseded ? 'tournament_result_superseded' : 'tournament_result_delivered',
        matchId: report.mid,
        tournamentId: report.tid,
        outcome: result.outcome,
      });
    }
    // Told before the report leaves storage: the listener's (unawaited) record write and this
    // delete land in one batch, so a restart never keeps the delete but loses the answer.
    this.notify({ matchId: report.mid, outcome: result.status === 'rejected' ? 'rejected' : result.outcome });
    await this.options.storage.delete([key]);
    this.consecutiveFailures = 0;
    return true;
  }

  /** Sends the match's newest ping (read at send time); false when delivery should stop for now. */
  private async deliverProgress(key: string): Promise<boolean> {
    const { storage, transport } = this.options;
    const ping = await storage.get<MatchProgressReport>(key);
    if (!ping) return true;
    const result = await transport.sendProgress(ping);
    if (result.status === 'retry') {
      // Counted apart from results: a ping losing a write race (409) must not delay the next result.
      this.pingFailures++;
      return this.backOff('tournament_progress_delivery_failed', ping.mid, result.reason, this.pingFailures);
    }
    // A server from before progress pings (or one that no longer knows the match) refuses them:
    // nothing to keep, a ping is only worth something while it is fresh.
    if (result.status === 'rejected') this.log({ level: 'warn', msg: 'tournament_progress_dropped', matchId: ping.mid, reason: result.reason });
    // A newer ping that replaced this one while it was on its way still has to go.
    const current = await storage.get<MatchProgressReport>(key);
    if (current && current.at === ping.at && current.round === ping.round) await storage.delete([key]);
    this.pingFailures = 0;
    return true;
  }

  private async backOff(msg: string, matchId: string, reason: string, attempt: number): Promise<false> {
    const retryInMs = deliveryBackoffMs(attempt);
    this.log({ level: 'warn', msg, matchId, reason, attempt, retryInMs });
    await this.options.alarm.setAlarm(this.now() + retryInMs);
    return false;
  }

  private notify(delivered: DeliveredMatchResult): void {
    try {
      this.listener?.(delivered);
    } catch (error) {
      this.log({ level: 'error', msg: 'tournament_result_outcome_listener_failed', matchId: delivered.matchId, error: String(error) });
    }
  }
}
