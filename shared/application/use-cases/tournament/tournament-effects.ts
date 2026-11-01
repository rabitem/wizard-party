import { involvedUserIds, roundLabel, type Tournament } from '../../../domain/tournament';
import type { IProgressRefresher, ITournamentInbox, TournamentEffectErrorReporter } from '../../ports/tournament';

/**
 * Side effects of a saved state change, derived from the difference between the state before and
 * after: newly seated tables notify their players, a completion notifies everyone involved and
 * refreshes their progress (award XP, achievements). Runs only after the save succeeded, so a
 * conflicting writer that retries never notifies twice. Failures are reported, never thrown: the
 * tournament has already moved on and a missing notification must not undo that.
 */
export class TournamentEffects {
  constructor(
    private readonly inbox: ITournamentInbox,
    private readonly progress: IProgressRefresher,
    private readonly reportError: TournamentEffectErrorReporter = () => undefined
  ) {}

  async dispatch(before: Tournament, after: Tournament): Promise<void> {
    const tasks: { name: string; run: () => Promise<unknown> }[] = [];

    const known = new Set(before.matches.map((match) => match.id));
    for (const match of after.matches) {
      if (known.has(match.id) || match.status !== 'pending') continue;
      const payload = { tournamentId: after.id, name: after.name, matchId: match.id, round: match.round, roundLabel: roundLabel(after, match.round) };
      for (const seat of match.seats) {
        if (seat.userId === null) continue;
        const userId = seat.userId;
        tasks.push({ name: 'tournament_table_ready', run: () => this.inbox.deliver({ userId, kind: 'tournament_table_ready', actorId: null, payload }) });
      }
    }

    if (before.status !== 'completed' && after.status === 'completed') {
      const involved = involvedUserIds(after);
      for (const userId of involved) {
        const entrant = after.entrants.find((candidate) => candidate.userId === userId);
        const payload = {
          tournamentId: after.id,
          name: after.name,
          rank: entrant?.final?.rank ?? null,
          entrants: after.entrants.length,
          awards: after.awards.filter((award) => award.userId === userId).map((award) => award.awardId),
        };
        tasks.push({ name: 'tournament_finished', run: () => this.inbox.deliver({ userId, kind: 'tournament_finished', actorId: null, payload }) });
      }
      tasks.push({ name: 'tournament_progress_refresh', run: () => this.progress.refresh(involved) });
    }

    const results = await Promise.allSettled(tasks.map((task) => task.run()));
    results.forEach((result, index) => {
      if (result.status === 'rejected') this.reportError(tasks[index].name, result.reason);
    });
  }
}
