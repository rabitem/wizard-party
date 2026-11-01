import { DEFAULT_SOCIAL_SETTINGS, type InboxDelivery, type RelationshipFacts, type SocialPlayer, type SocialSettings } from '../../../domain/social';
import { participationOf, type Tournament, type TournamentParticipation, type TournamentRateLimitedAction } from '../../../domain/tournament';
import { signMatchTicket, type MatchTicketClaims } from '../../../tournament';
import type {
  ChampionRow,
  EntryRecord,
  IProgressRefresher,
  ITournamentHistoryReader,
  ITournamentIdGenerator,
  ITournamentInbox,
  ITournamentPlayerDirectory,
  ITournamentRelationships,
  ITournamentRepository,
  ITournamentThrottle,
  ITournamentTicketSigner,
  MatchResultRecord,
  SaveTournamentResult,
  TournamentListQuery,
  TournamentSummary,
  TrophyRecord,
  UserTournamentRow,
} from '../../ports/tournament';
import { summarizeTournament } from './tournament-views';

/* In-memory adapters for tournament use case tests (and other slices' tests). No SQL, no indexes. */

const LIST_STATUS = { open: 'registration', live: 'running', finished: 'completed' } as const;

function sortAt(summary: TournamentSummary, status: TournamentListQuery['status']): number {
  if (status === 'live') return summary.startedAt ?? summary.createdAt;
  if (status === 'finished') return summary.completedAt ?? summary.createdAt;
  return summary.createdAt;
}

export class MemoryTournamentRepository implements ITournamentRepository, ITournamentHistoryReader {
  readonly rows = new Map<string, Tournament>();
  saves = 0;
  conflicts = 0;
  /** Runs once right before the next save, e.g. to simulate a concurrent writer. */
  beforeNextSave: (() => Promise<void>) | null = null;

  async get(id: string): Promise<Tournament | null> {
    await Promise.resolve();
    const row = this.rows.get(id);
    return row ? structuredClone(row) : null;
  }

  async save(tournament: Tournament, expectedVersion: number): Promise<SaveTournamentResult> {
    const hook = this.beforeNextSave;
    this.beforeNextSave = null;
    if (hook) await hook();
    await Promise.resolve();
    const current = this.rows.get(tournament.id);
    if ((current?.version ?? 0) !== expectedVersion || tournament.version !== expectedVersion + 1) {
      this.conflicts += 1;
      return 'conflict';
    }
    this.rows.set(tournament.id, structuredClone(tournament));
    this.saves += 1;
    return 'saved';
  }

  async list({ status, after, limit }: TournamentListQuery): Promise<TournamentSummary[]> {
    return [...this.rows.values()]
      .filter((row) => row.visibility === 'public' && row.status === LIST_STATUS[status])
      .map(summarizeTournament)
      .sort((a, b) => sortAt(b, status) - sortAt(a, status) || (b.id < a.id ? -1 : 1))
      .filter((row) => !after || sortAt(row, status) < after.sortAt || (sortAt(row, status) === after.sortAt && row.id < after.id))
      .slice(0, limit);
  }

  async listForUser(userId: string, limit: number): Promise<UserTournamentRow[]> {
    return [...this.rows.values()]
      .filter((row) => row.host.userId === userId || row.entrants.some((entrant) => entrant.userId === userId))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map((row) => {
        const entrant = row.entrants.find((candidate) => candidate.userId === userId);
        return {
          summary: summarizeTournament(row),
          isHost: row.host.userId === userId,
          entry: entrant ? { status: entrant.status, seed: entrant.seed, finalRank: entrant.final?.rank ?? null } : null,
        };
      });
  }

  async countActiveHosted(userId: string): Promise<number> {
    return [...this.rows.values()].filter((row) => row.host.userId === userId && (row.status === 'registration' || row.status === 'running')).length;
  }

  async recentChampions(limit: number): Promise<ChampionRow[]> {
    return [...this.rows.values()]
      .filter((row) => row.status === 'completed' && row.visibility === 'public')
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
      .flatMap((row) => {
        const champion = row.entrants.find((entrant) => entrant.final?.rank === 1);
        return champion
          ? [{
              tournamentId: row.id,
              tournamentName: row.name,
              format: row.format,
              completedAt: row.completedAt!,
              entrants: row.entrants.length,
              champion: { userId: champion.userId, username: champion.username, displayName: champion.displayName },
            }]
          : [];
      })
      .slice(0, limit);
  }

  async listOpenHostedIds(userId: string): Promise<string[]> {
    return [...this.rows.values()].filter((row) => row.host.userId === userId && row.status === 'registration').map((row) => row.id);
  }

  async listActiveHostedIds(userId: string): Promise<string[]> {
    return [...this.rows.values()].filter((row) => row.host.userId === userId && (row.status === 'registration' || row.status === 'running')).map((row) => row.id);
  }

  async forgetHost(userId: string, displayName: string): Promise<void> {
    for (const [id, row] of this.rows) {
      if (row.host.userId === userId) this.rows.set(id, { ...row, host: { ...row.host, username: null, displayName } });
    }
  }

  // ITournamentHistoryReader
  async participations(userId: string): Promise<TournamentParticipation[]> {
    return [...this.rows.values()]
      .map((row) => participationOf(row, userId))
      .filter((row): row is TournamentParticipation => row !== null)
      .sort((a, b) => a.finishedAt - b.finishedAt);
  }

  async trophies(userId: string, limit: number): Promise<TrophyRecord[]> {
    return [...this.rows.values()]
      .flatMap((row) =>
        row.awards
          .filter((award) => award.userId === userId)
          .map((award) => ({
            tournamentId: row.id,
            tournamentName: row.name,
            format: row.format,
            awardId: award.awardId,
            tier: award.tier,
            xp: award.xp,
            awardedAt: award.awardedAt,
            entrants: row.entrants.length,
            finalRank: row.entrants.find((entrant) => entrant.userId === userId)?.final?.rank ?? null,
          }))
      )
      .sort((a, b) => b.awardedAt - a.awardedAt)
      .slice(0, limit);
  }

  async entries(userId: string, limit: number): Promise<EntryRecord[]> {
    return [...this.rows.values()]
      .flatMap((row) => row.entrants.filter((entrant) => entrant.userId === userId).map((entrant) => ({ row, entrant })))
      .map(({ row, entrant }) => ({
        tournamentId: row.id,
        username: entrant.username,
        displayName: entrant.displayName,
        level: entrant.level,
        seed: entrant.seed,
        status: entrant.status,
        joinedAt: entrant.joinedAt,
      }))
      .sort((a, b) => b.joinedAt - a.joinedAt)
      .slice(0, limit);
  }

  async matchResults(userId: string, limit: number): Promise<MatchResultRecord[]> {
    return [...this.rows.values()]
      .flatMap((row) =>
        row.matches.flatMap((match) =>
          (match.result?.players ?? [])
            .filter((player) => player.userId === userId)
            .map((player) => ({
              tournamentId: row.id,
              matchId: match.id,
              round: match.round,
              table: match.table,
              matchStatus: match.status,
              completedAt: match.result?.completedAt ?? null,
              placement: player.placement,
              score: player.score,
              points: player.points,
              rounds: [...player.rounds],
              noShow: player.noShow,
              botTakeover: player.botTakeover,
            }))
        )
      )
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
      .slice(0, limit);
  }
}

export class FakeTournamentInbox implements ITournamentInbox {
  delivered: InboxDelivery[] = [];
  failWith: Error | null = null;

  async deliver(delivery: InboxDelivery): Promise<string> {
    if (this.failWith) throw this.failWith;
    this.delivered.push(delivery);
    return `item-${this.delivered.length}`;
  }

  ofKind<K extends InboxDelivery['kind']>(kind: K): Extract<InboxDelivery, { kind: K }>[] {
    return this.delivered.filter((delivery): delivery is Extract<InboxDelivery, { kind: K }> => delivery.kind === kind);
  }
}

export class FakeProgressRefresher implements IProgressRefresher {
  refreshed: string[][] = [];

  async refresh(userIds: readonly string[]): Promise<void> {
    this.refreshed.push([...userIds].sort());
  }
}

export class FakeTournamentThrottle implements ITournamentThrottle {
  denied = new Set<TournamentRateLimitedAction>();
  calls: { action: TournamentRateLimitedAction; subject: string }[] = [];

  async allow(action: TournamentRateLimitedAction, subject: string): Promise<boolean> {
    this.calls.push({ action, subject });
    return !this.denied.has(action);
  }
}

export class HmacTicketSigner implements ITournamentTicketSigner {
  constructor(private readonly secret: string) {}

  sign(claims: MatchTicketClaims): Promise<string> {
    return signMatchTicket(this.secret, claims);
  }
}

export class SequentialTournamentIds implements ITournamentIdGenerator {
  private next = 0;
  /** Ids handed out first (e.g. to force a collision). */
  queue: string[] = [];

  tournamentId(): string {
    return this.queue.shift() ?? `tourney${String(++this.next).padStart(5, '0')}`;
  }

  inviteCode(): string {
    return 'abcdefgh';
  }
}

export class FakeTournamentPlayers implements ITournamentPlayerDirectory, ITournamentRelationships {
  players = new Map<string, SocialPlayer>();
  settings = new Map<string, SocialSettings>();
  friends = new Set<string>();
  blocks = new Set<string>();

  add(userId: string, overrides: Partial<SocialPlayer> = {}): void {
    this.players.set(userId, { userId, username: userId, displayName: userId.toUpperCase(), avatar: null, level: 1, hasPublicProfile: true, ...overrides });
  }

  async findById(userId: string): Promise<SocialPlayer | null> {
    return this.players.get(userId) ?? null;
  }

  async getSettings(userId: string): Promise<SocialSettings> {
    return this.settings.get(userId) ?? DEFAULT_SOCIAL_SETTINGS;
  }

  async relationshipFacts(viewerId: string, targetId: string): Promise<RelationshipFacts> {
    return {
      isFriend: this.friends.has(`${viewerId}:${targetId}`) || this.friends.has(`${targetId}:${viewerId}`),
      blockedByViewer: this.blocks.has(`${viewerId}->${targetId}`),
      blockedByTarget: this.blocks.has(`${targetId}->${viewerId}`),
      outgoingRequest: null,
      incomingPending: false,
      targetPolicy: 'everyone',
      viewerFriendCount: 0,
      targetFriendCount: 0,
      viewerPendingOutgoing: 0,
    };
  }
}
