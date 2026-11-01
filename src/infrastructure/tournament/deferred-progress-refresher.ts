import type { IProgressRefresher, TournamentEffectErrorReporter } from '@shared/application/ports/tournament';

/** Runs a task after the response was sent (Next.js `after`), or right away outside a request. */
export type BackgroundScheduler = (task: () => Promise<void>) => void;

/**
 * Moves the progress refresh off the request path: the worker's result report (or the host's
 * last click) answers as soon as the tournament is saved, and recomputing every participant (up
 * to 64 players plus the host) follows in the background. Failures go to the reporter; a player's
 * next game recomputes their progress anyway.
 */
export class DeferredProgressRefresher implements IProgressRefresher {
  constructor(
    private readonly inner: () => IProgressRefresher,
    private readonly schedule: BackgroundScheduler,
    private readonly reportError: TournamentEffectErrorReporter
  ) {}

  async refresh(userIds: readonly string[]): Promise<void> {
    const ids = [...userIds];
    if (ids.length === 0) return;
    this.schedule(async () => {
      try {
        await this.inner().refresh(ids);
      } catch (error) {
        this.reportError('tournament_progress_refresh', error);
      }
    });
  }
}
