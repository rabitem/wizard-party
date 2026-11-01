import { acceptsInviteFrom } from '../../../domain/social';
import { TOURNAMENT_LIMITS, TournamentError, findEntrant, isHost, registerEntrant, withdrawEntrant } from '../../../domain/tournament';
import type { ITournamentInbox, ITournamentPlayerDirectory, ITournamentRelationships, ITournamentThrottle } from '../../ports/tournament';
import { requireAllowance, requireTournamentPlayer } from './tournament-management.use-cases';
import type { TournamentStore } from './tournament-store';
import { toDetailView, type TournamentDetailView } from './tournament-views';

export interface RegisterForTournamentInput {
  /** Needed for private tournaments. */
  inviteCode?: unknown;
}

/** Signs the viewer up (name, handle and level are read from their account, never the client). */
export class RegisterForTournamentUseCase {
  constructor(
    private readonly store: TournamentStore,
    private readonly directory: ITournamentPlayerDirectory,
    private readonly throttle: ITournamentThrottle
  ) {}

  async execute(viewerId: string, tournamentId: unknown, input: RegisterForTournamentInput = {}): Promise<TournamentDetailView> {
    await requireAllowance(this.throttle, 'register', viewerId);
    const profile = await requireTournamentPlayer(this.directory, viewerId);
    const { after, now } = await this.store.mutate(tournamentId, (tournament, at) =>
      registerEntrant(tournament, profile, { now: at, inviteCode: input.inviteCode })
    );
    return toDetailView(after, viewerId, now);
  }
}

/** Withdrawing is possible while registration is open; it removes the entry. */
export class WithdrawFromTournamentUseCase {
  constructor(private readonly store: TournamentStore) {}

  async execute(viewerId: string, tournamentId: unknown): Promise<TournamentDetailView> {
    const { after, now } = await this.store.mutate(tournamentId, (tournament) => withdrawEntrant(tournament, viewerId));
    return toDetailView(after, viewerId, now);
  }
}

export type TournamentInviteSkipReason = 'self' | 'already_registered' | 'not_found' | 'not_allowed' | 'recently_invited' | 'rate_limited';

export interface InviteToTournamentResult {
  invited: string[];
  skipped: { userId: string; reason: TournamentInviteSkipReason }[];
}

function parseUserIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > TOURNAMENT_LIMITS.MAX_INVITES_PER_REQUEST) {
    throw new TournamentError('invalid_input', `Invite 1–${TOURNAMENT_LIMITS.MAX_INVITES_PER_REQUEST} players at a time.`);
  }
  if (!value.every((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= TOURNAMENT_LIMITS.MAX_PLAYER_ID_LENGTH)) {
    throw new TournamentError('invalid_input', 'userIds must be player ids.');
  }
  return [...new Set(value)];
}

/**
 * The host invites players to register. Each recipient's invite policy and blocks decide, exactly
 * as for game invites; refused recipients are reported as skipped with the same neutral reason, so
 * policies and blocks can't be told apart. One invite per tournament and recipient (dedupe).
 */
export class InviteToTournamentUseCase {
  constructor(
    private readonly store: TournamentStore,
    private readonly directory: ITournamentPlayerDirectory,
    private readonly relationships: ITournamentRelationships,
    private readonly inbox: ITournamentInbox,
    private readonly throttle: ITournamentThrottle
  ) {}

  async execute(viewerId: string, tournamentId: unknown, input: { userIds?: unknown }): Promise<InviteToTournamentResult> {
    const userIds = parseUserIds(input.userIds);
    const { tournament } = await this.store.read(tournamentId);
    if (!isHost(tournament, viewerId)) throw new TournamentError('forbidden', 'Only the host can invite players.');
    if (tournament.status !== 'registration') throw new TournamentError('invalid_state', 'Registration is closed.');

    const result: InviteToTournamentResult = { invited: [], skipped: [] };
    const payload = { tournamentId: tournament.id, name: tournament.name, inviteCode: tournament.inviteCode };
    for (const userId of userIds) {
      const reason = await this.refusal(viewerId, userId, tournament.id, findEntrant(tournament, userId) !== null);
      if (reason) {
        result.skipped.push({ userId, reason });
        continue;
      }
      await this.inbox.deliver({ userId, kind: 'tournament_invite', actorId: viewerId, payload });
      result.invited.push(userId);
    }
    return result;
  }

  private async refusal(viewerId: string, userId: string, tournamentId: string, isEntrant: boolean): Promise<TournamentInviteSkipReason | null> {
    if (userId === viewerId) return 'self';
    if (isEntrant) return 'already_registered';
    if (!(await this.directory.findById(userId))) return 'not_found';
    const [facts, settings] = await Promise.all([this.relationships.relationshipFacts(viewerId, userId), this.directory.getSettings(userId)]);
    if (facts.blockedByViewer || facts.blockedByTarget || !acceptsInviteFrom(settings.invitePolicy, facts.isFriend)) return 'not_allowed';
    if (!(await this.throttle.allow('invite', viewerId))) return 'rate_limited';
    if (!(await this.throttle.allow('invite_pair', `${tournamentId}:${userId}`))) return 'recently_invited';
    return null;
  }
}
