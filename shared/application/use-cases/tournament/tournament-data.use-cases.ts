import { cancelTournament, isTournamentError } from '../../../domain/tournament';
import type { EntryRecord, ITournamentHistoryReader, ITournamentRepository, MatchResultRecord, TrophyRecord, UserTournamentRow } from '../../ports/tournament';
import type { TournamentStore } from './tournament-store';

/** Upper bound of rows in an export; far above what one account accumulates. */
const EXPORT_LIMIT = 10_000;

/** Shown as host of the tournaments of a deleted account (like "Former player" for entrants). */
export const FORMER_HOST_NAME = 'Former host';

export interface TournamentDataExport {
  /** Tournaments the player hosted or entered, with their entry. */
  tournaments: UserTournamentRow[];
  /** Completed tournaments as achievements see them. */
  participations: Awaited<ReturnType<ITournamentHistoryReader['participations']>>;
  trophies: TrophyRecord[];
  /** The player's entries as stored at registration (handle, name, level, seed, join time). */
  entries: EntryRecord[];
  /** Every stored per-table result: placement, score, points, bids and tricks per round, no-show, takeover. */
  matchResults: MatchResultRecord[];
}

/** GDPR Art. 20: the tournament part of the account export. */
export class ExportTournamentDataUseCase {
  constructor(
    private readonly repository: ITournamentRepository,
    private readonly history: ITournamentHistoryReader
  ) {}

  async execute(userId: string): Promise<TournamentDataExport> {
    const [tournaments, participations, trophies, entries, matchResults] = await Promise.all([
      this.repository.listForUser(userId, EXPORT_LIMIT),
      this.history.participations(userId),
      this.history.trophies(userId, EXPORT_LIMIT),
      this.history.entries(userId, EXPORT_LIMIT),
      this.history.matchResults(userId, EXPORT_LIMIT),
    ]);
    return { tournaments, participations, trophies, entries, matchResults };
  }
}

/**
 * Runs before an account is deleted. Entries and awards go with the account (ON DELETE CASCADE);
 * this cancels the tournaments the player hosts that are still in registration, so nobody waits
 * for a host who is gone, and replaces the host's handle and name on all of them (a released
 * handle must never link to someone else). Running tournaments finish on their own (lazy
 * transitions) without a host. Entrants are not notified of the cancellation.
 */
export class PurgeTournamentDataUseCase {
  constructor(
    private readonly repository: ITournamentRepository,
    private readonly store: TournamentStore
  ) {}

  async execute(userId: string): Promise<{ cancelled: number }> {
    // Bounded by TOURNAMENT_LIMITS.MAX_ACTIVE_HOSTED: creating more is refused.
    const ids = await this.repository.listOpenHostedIds(userId);
    let cancelled = 0;
    for (const id of ids) {
      try {
        const { after, before } = await this.store.mutate(id, (tournament, now) =>
          tournament.status === 'registration' ? cancelTournament(tournament, userId, now) : tournament
        );
        if (after.status === 'cancelled' && before.status !== 'cancelled') cancelled += 1;
      } catch (error) {
        // Gone or started meanwhile: nothing to cancel.
        if (!isTournamentError(error)) throw error;
      }
    }
    await this.repository.forgetHost(userId, FORMER_HOST_NAME);
    return { cancelled };
  }
}
