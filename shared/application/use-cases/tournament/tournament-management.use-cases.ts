import {
  TOURNAMENT_LIMITS,
  TournamentError,
  cancelTournament,
  createTournament,
  parseTournamentChanges,
  parseTournamentDraft,
  registerEntrant,
  resolveStaleMatch,
  startTournament,
  tournamentDraftOf,
  updateTournament,
  type EntrantProfile,
  type TournamentRateLimitedAction,
} from '../../../domain/tournament';
import type { IClock } from '../../ports/account';
import type { ITournamentIdGenerator, ITournamentPlayerDirectory, ITournamentRepository, ITournamentThrottle } from '../../ports/tournament';
import type { TournamentStore } from './tournament-store';
import { toDetailView, type TournamentDetailView } from './tournament-views';

export const TOURNAMENT_RATE_LIMITED_MESSAGE = "You're doing that too often. Take a breather and try again in a moment.";

export async function requireAllowance(throttle: ITournamentThrottle, action: TournamentRateLimitedAction, subject: string): Promise<void> {
  if (!(await throttle.allow(action, subject))) throw new TournamentError('rate_limited', TOURNAMENT_RATE_LIMITED_MESSAGE);
}

/** Tournaments are for accounts; the username (every account has one) names them on tables and standings. */
export async function requireTournamentPlayer(directory: ITournamentPlayerDirectory, userId: string): Promise<EntrantProfile> {
  const player = await directory.findById(userId);
  if (!player) throw new TournamentError('not_found', 'No such player.');
  return { userId, username: player.username, displayName: player.displayName, level: player.level };
}

/** Attempts at finding an unused id (collisions of 12 random characters are astronomically rare). */
const MAX_ID_ATTEMPTS = 3;

export interface CreateTournamentInput {
  /** The draft fields (name, description, format, settings, visibility, startsAt). */
  [field: string]: unknown;
  /** The host takes part (default true). */
  joinAsEntrant?: unknown;
}

export class CreateTournamentUseCase {
  constructor(
    private readonly repository: ITournamentRepository,
    private readonly store: TournamentStore,
    private readonly directory: ITournamentPlayerDirectory,
    private readonly throttle: ITournamentThrottle,
    private readonly ids: ITournamentIdGenerator,
    private readonly clock: IClock
  ) {}

  async execute(viewerId: string, input: CreateTournamentInput): Promise<TournamentDetailView> {
    const now = this.clock.now();
    const draft = parseTournamentDraft(input, now);
    const host = await requireTournamentPlayer(this.directory, viewerId);
    if (!(await this.underHostingLimit(viewerId))) {
      throw new TournamentError('invalid_state', `You can host up to ${TOURNAMENT_LIMITS.MAX_ACTIVE_HOSTED} tournaments at a time.`);
    }
    await requireAllowance(this.throttle, 'create', viewerId);

    for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt++) {
      let tournament = createTournament({
        id: this.ids.tournamentId(),
        inviteCode: this.ids.inviteCode(),
        host: { userId: host.userId, username: host.username, displayName: host.displayName },
        draft,
        now,
      });
      if (input.joinAsEntrant !== false) tournament = registerEntrant(tournament, host, { now });
      const stored = { ...tournament, version: 1 };
      if ((await this.repository.save(stored, 0)) === 'saved') return toDetailView(stored, viewerId, now);
    }
    throw new TournamentError('conflict', 'Could not create the tournament. Please try again.');
  }

  /**
   * Stored statuses lag behind due transitions (an expired registration, a running tournament whose
   * tables all timed out), so at the limit the host's active tournaments are brought up to date
   * before the count is trusted.
   */
  private async underHostingLimit(hostId: string): Promise<boolean> {
    if ((await this.repository.countActiveHosted(hostId)) < TOURNAMENT_LIMITS.MAX_ACTIVE_HOSTED) return true;
    for (const id of await this.repository.listActiveHostedIds(hostId)) {
      try {
        await this.store.read(id);
      } catch (error) {
        // Gone or busy: it keeps counting as stored.
        if (!(error instanceof TournamentError)) throw error;
      }
    }
    return (await this.repository.countActiveHosted(hostId)) < TOURNAMENT_LIMITS.MAX_ACTIVE_HOSTED;
  }
}

export class UpdateTournamentUseCase {
  constructor(
    private readonly store: TournamentStore,
    private readonly ids: ITournamentIdGenerator
  ) {}

  async execute(viewerId: string, tournamentId: unknown, input: unknown): Promise<TournamentDetailView> {
    const { after, now } = await this.store.mutate(tournamentId, (tournament, at) =>
      updateTournament(tournament, viewerId, parseTournamentChanges(input, tournamentDraftOf(tournament), at), this.ids.inviteCode())
    );
    return toDetailView(after, viewerId, now);
  }
}

export class StartTournamentUseCase {
  constructor(private readonly store: TournamentStore) {}

  async execute(viewerId: string, tournamentId: unknown): Promise<TournamentDetailView> {
    const { after, now } = await this.store.mutate(tournamentId, (tournament, at) => startTournament(tournament, viewerId, at));
    return toDetailView(after, viewerId, now);
  }
}

export class CancelTournamentUseCase {
  constructor(private readonly store: TournamentStore) {}

  async execute(viewerId: string, tournamentId: unknown): Promise<TournamentDetailView> {
    const { after, now } = await this.store.mutate(tournamentId, (tournament, at) => cancelTournament(tournament, viewerId, at));
    return toDetailView(after, viewerId, now);
  }
}

/** The host voids a table that has been pending past TOURNAMENT_TIMING.MATCH_STALE_AFTER_MS. */
export class ResolveStaleMatchUseCase {
  constructor(private readonly store: TournamentStore) {}

  async execute(viewerId: string, tournamentId: unknown, matchId: unknown): Promise<TournamentDetailView> {
    if (typeof matchId !== 'string') throw new TournamentError('not_found', 'No such match.');
    const { after, now } = await this.store.mutate(tournamentId, (tournament, at) => resolveStaleMatch(tournament, viewerId, matchId, at));
    return toDetailView(after, viewerId, now);
  }
}
