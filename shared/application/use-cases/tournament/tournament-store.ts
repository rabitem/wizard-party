import { TOURNAMENT_LIMITS, TournamentError, applyDueTransitions, isTournamentId, type Tournament } from '../../../domain/tournament';
import type { IClock } from '../../ports/account';
import type { ITournamentRepository } from '../../ports/tournament';
import type { TournamentEffects } from './tournament-effects';

export interface TournamentChange {
  /** State loaded from the repository. */
  before: Tournament;
  /** State after due transitions and the change (=== before when nothing changed). */
  after: Tournament;
  now: number;
}

export function requireTournamentId(value: unknown): string {
  // A malformed id can't name a tournament; answer like an unknown one.
  if (!isTournamentId(value)) throw new TournamentError('not_found', 'No such tournament.');
  return value;
}

/**
 * Unit of work around the aggregate: load, apply what became due (lazy transitions), apply the
 * change, save with optimistic concurrency. A conflicting writer reloads and re-applies its change
 * on the fresh state, so concurrent results, registrations and reads all converge. Side effects
 * run once, after the winning save.
 *
 * While tournaments are unavailable (`isAvailable`, e.g. no TOURNAMENT_SECRET) nothing moves:
 * reads show the stored state without applying due transitions (no auto-start, no voided tables
 * the game worker could not have played), and changes are refused as 'unavailable'.
 */
export class TournamentStore {
  constructor(
    private readonly repository: ITournamentRepository,
    private readonly effects: TournamentEffects,
    private readonly clock: IClock,
    private readonly isAvailable: () => boolean = () => true
  ) {}

  async mutate(id: unknown, change: (tournament: Tournament, now: number) => Tournament): Promise<TournamentChange> {
    const tournamentId = requireTournamentId(id);
    if (!this.isAvailable()) throw new TournamentError('unavailable', 'Tournaments are not available right now.');
    for (let attempt = 0; attempt < TOURNAMENT_LIMITS.MAX_SAVE_ATTEMPTS; attempt++) {
      const before = await this.repository.get(tournamentId);
      if (!before) throw new TournamentError('not_found', 'No such tournament.');
      const now = this.clock.now();
      const changed = change(applyDueTransitions(before, now), now);
      if (changed === before) return { before, after: before, now };
      const after = { ...changed, version: before.version + 1 };
      if ((await this.repository.save(after, before.version)) === 'saved') {
        await this.effects.dispatch(before, after);
        return { before, after, now };
      }
    }
    throw new TournamentError('conflict', 'The tournament is busy right now. Please try again.');
  }

  /** The current state with everything due applied (and persisted); as stored while unavailable. */
  async read(id: unknown): Promise<{ tournament: Tournament; now: number }> {
    if (!this.isAvailable()) {
      const tournament = await this.repository.get(requireTournamentId(id));
      if (!tournament) throw new TournamentError('not_found', 'No such tournament.');
      return { tournament, now: this.clock.now() };
    }
    const { after, now } = await this.mutate(id, (tournament) => tournament);
    return { tournament: after, now };
  }
}
