import {
  TOURNAMENT_LIMITS,
  TournamentError,
  findEntrant,
  isHost,
  isTournamentId,
  normalizeInviteCode,
  registrationDueAt,
  type Tournament,
} from '../../../domain/tournament';
import type { IClock } from '../../ports/account';
import type { ITournamentHistoryReader, ITournamentRepository, TournamentListPosition, TournamentListStatus, TournamentSummary } from '../../ports/tournament';
import type { TournamentStore } from './tournament-store';
import {
  toDetailView,
  toMyTournamentView,
  toSummaryView,
  toTrophyView,
  type ChampionView,
  type MyTournamentsView,
  type TournamentDetailView,
  type TournamentListPage,
  type TrophyView,
} from './tournament-views';

/** Private tournaments are visible to the host, entrants and holders of the invite code only. */
export function canView(tournament: Tournament, viewerId: string | null, code: unknown): boolean {
  if (tournament.visibility === 'public') return true;
  if (isHost(tournament, viewerId) || findEntrant(tournament, viewerId)) return true;
  return normalizeInviteCode(code) !== null && normalizeInviteCode(code) === tournament.inviteCode;
}

export class GetTournamentUseCase {
  constructor(private readonly store: TournamentStore) {}

  /** `viewerId` is null for guests; `code` unlocks private tournaments. */
  async execute(viewerId: string | null, tournamentId: unknown, code?: unknown): Promise<TournamentDetailView> {
    const { tournament, now } = await this.store.read(tournamentId);
    // Answer exactly like an unknown id, so private tournaments can't be probed.
    if (!canView(tournament, viewerId, code)) throw new TournamentError('not_found', 'No such tournament.');
    return toDetailView(tournament, viewerId, now);
  }
}

const LIST_STATUSES: readonly TournamentListStatus[] = ['open', 'live', 'finished'];

function sortAtOf(summary: TournamentSummary, status: TournamentListStatus): number {
  if (status === 'live') return summary.startedAt ?? summary.createdAt;
  if (status === 'finished') return summary.completedAt ?? summary.createdAt;
  return summary.createdAt;
}

export function encodeTournamentCursor(position: TournamentListPosition): string {
  return `${position.sortAt}.${position.id}`;
}

/** Largest epoch ms a JavaScript Date (and so the repository's timestamp parameter) can hold. */
const MAX_DATE_MS = 8.64e15;

export function decodeTournamentCursor(value: unknown): TournamentListPosition | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const [time, id, extra] = typeof value === 'string' ? value.split('.') : [];
  const sortAt = Number(time);
  if (!Number.isSafeInteger(sortAt) || Math.abs(sortAt) > MAX_DATE_MS || !isTournamentId(id) || extra !== undefined) {
    throw new TournamentError('invalid_input', 'invalid cursor');
  }
  return { sortAt, id };
}

export interface ListTournamentsInput {
  status?: unknown;
  cursor?: unknown;
  limit?: unknown;
}

/** Public lists by status (keyset paginated) and the recent champions strip. Open to guests. */
export class ListTournamentsUseCase {
  constructor(
    private readonly repository: ITournamentRepository,
    private readonly store: TournamentStore,
    private readonly clock: IClock
  ) {}

  async execute(input: ListTournamentsInput = {}): Promise<TournamentListPage> {
    const status = (input.status ?? 'open') as TournamentListStatus;
    if (!LIST_STATUSES.includes(status)) throw new TournamentError('invalid_input', 'status must be open, live or finished');
    const requested = input.limit === undefined || input.limit === null || input.limit === '' ? TOURNAMENT_LIMITS.LIST_PAGE_SIZE : Number(input.limit);
    if (!Number.isInteger(requested) || requested < 1) throw new TournamentError('invalid_input', 'limit must be a positive whole number');
    const limit = Math.min(requested, TOURNAMENT_LIMITS.MAX_LIST_PAGE_SIZE);

    const rows = await this.repository.list({ status, after: decodeTournamentCursor(input.cursor), limit: limit + 1 });
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    return {
      items: (await this.withoutStaleRows(page)).map(toSummaryView),
      // The cursor follows the stored order, so dropping a stale row never skips another.
      nextCursor: rows.length > limit && last ? encodeTournamentCursor({ sortAt: sortAtOf(last, status), id: last.id }) : null,
    };
  }

  /**
   * Rows store the status as of the last read. A registration that became due (its scheduled
   * start, or expiry) is brought up to date like any read would; if that moved it to another
   * status, it no longer belongs on this list.
   */
  private async withoutStaleRows(page: TournamentSummary[]): Promise<TournamentSummary[]> {
    const now = this.clock.now();
    const kept = await Promise.all(
      page.map(async (row) => {
        const dueAt = registrationDueAt(row);
        if (dueAt === null || dueAt > now) return row;
        try {
          const { tournament } = await this.store.read(row.id);
          return tournament.status === row.status ? row : null;
        } catch {
          // Busy or gone: show the stored row; the next read settles it.
          return row;
        }
      })
    );
    return kept.filter((row): row is TournamentSummary => row !== null);
  }

  async champions(limit: number = TOURNAMENT_LIMITS.RECENT_CHAMPIONS): Promise<ChampionView[]> {
    return this.repository.recentChampions(Math.min(Math.max(1, limit), TOURNAMENT_LIMITS.RECENT_CHAMPIONS));
  }
}

/** The signed-in player's tournaments, grouped for the UI, plus their trophies. */
export class ListMyTournamentsUseCase {
  constructor(
    private readonly repository: ITournamentRepository,
    private readonly history: ITournamentHistoryReader
  ) {}

  async execute(viewerId: string): Promise<MyTournamentsView> {
    const [rows, trophies] = await Promise.all([
      this.repository.listForUser(viewerId, TOURNAMENT_LIMITS.MY_TOURNAMENTS_LIMIT),
      this.history.trophies(viewerId, TOURNAMENT_LIMITS.MY_TOURNAMENTS_LIMIT),
    ]);
    const views = rows.map(toMyTournamentView);
    return {
      upcoming: views.filter((view) => view.status === 'registration'),
      live: views.filter((view) => view.status === 'running'),
      past: views.filter((view) => view.status === 'completed' || view.status === 'cancelled'),
      trophies: trophies.map(toTrophyView).filter((view): view is TrophyView => view !== null),
    };
  }
}

/** Trophy cabinet of any account (for /account and public profiles). */
export class GetTrophyCabinetUseCase {
  constructor(private readonly history: ITournamentHistoryReader) {}

  async execute(userId: string, limit: number = TOURNAMENT_LIMITS.MY_TOURNAMENTS_LIMIT): Promise<TrophyView[]> {
    const trophies = await this.history.trophies(userId, limit);
    return trophies.map(toTrophyView).filter((view): view is TrophyView => view !== null);
  }
}
