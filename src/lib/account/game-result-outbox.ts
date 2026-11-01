import { ACCOUNT_LIMITS, type GameResult } from '@shared/domain/account';
import type { RecordGameResultsOutput } from '@shared/application/use-cases/account';

import { safeLocalStorage } from '../storage';
import { AccountApiError, accountApi } from './account-api';
import type { GameResultSink } from './game-result-sink';

const RETRY_DELAYS_MS = [2_000, 10_000, 30_000, 120_000];

/**
 * Durable outbox for game results of a signed-in player: results are written to localStorage
 * first and delivered with retries, so a closed tab or a flaky connection never loses a game.
 */
export class GameResultOutbox implements GameResultSink {
  private readonly storageKey: string;
  private flushing = false;
  private attempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    userId: string,
    private readonly onDelivered: (output: RecordGameResultsOutput) => void
  ) {
    this.storageKey = `wizard-party-account-outbox:${userId}`;
  }

  record(result: GameResult): void {
    this.write([...this.read().filter((pending) => pending.clientGameId !== result.clientGameId), result]);
    void this.flush();
  }

  pendingCount(): number {
    return this.read().length;
  }

  async flush(): Promise<void> {
    if (this.flushing) return;
    const batch = this.read().slice(0, ACCOUNT_LIMITS.MAX_RESULTS_PER_BATCH);
    if (batch.length === 0) return;
    this.flushing = true;
    try {
      const output = await accountApi.recordGames(batch);
      this.remove(batch);
      this.attempt = 0;
      this.onDelivered(output);
      if (this.read().length > 0) queueMicrotask(() => void this.flush());
    } catch (error) {
      if (error instanceof AccountApiError && error.status === 422) {
        // Never retry data the server rejects; it would block every later game.
        console.warn('[account] dropping rejected game results', error.message);
        this.remove(batch);
      } else {
        this.scheduleRetry();
      }
    } finally {
      this.flushing = false;
    }
  }

  dispose(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  private scheduleRetry(): void {
    if (this.retryTimer) return;
    const delay = RETRY_DELAYS_MS[Math.min(this.attempt, RETRY_DELAYS_MS.length - 1)];
    this.attempt += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.flush();
    }, delay);
  }

  private remove(sent: GameResult[]): void {
    const ids = new Set(sent.map((result) => result.clientGameId));
    this.write(this.read().filter((result) => !ids.has(result.clientGameId)));
  }

  private read(): GameResult[] {
    const results = safeLocalStorage.readJson(this.storageKey);
    return Array.isArray(results) ? results as GameResult[] : [];
  }

  private write(results: GameResult[]): void {
    // Storage full or blocked: SafeStorage keeps the outbox in memory for this visit.
    if (results.length === 0) safeLocalStorage.removeItem(this.storageKey);
    else safeLocalStorage.writeJson(this.storageKey, results);
  }
}
