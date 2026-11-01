import { ACCOUNT_LIMITS, isValidClientGameId } from '../../../domain/account';
import type { GameHistoryPosition, IClock, IGameResultRepository, ScoredGameResult } from '../../ports/account';
import { AccountError } from './account-error';

const MAX_CURSOR_LENGTH = 200;

function toBase64Url(text: string): string {
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
}

/** Opaque to clients: base64url of `[playedAt, clientGameId]`. Ids are ASCII, so btoa is safe. */
export function encodeHistoryCursor(position: GameHistoryPosition): string {
  return toBase64Url(JSON.stringify([position.playedAt, position.clientGameId]));
}

/** Returns null for anything that is not a cursor this server produced. */
export function decodeHistoryCursor(cursor: string): GameHistoryPosition | null {
  if (cursor.length === 0 || cursor.length > MAX_CURSOR_LENGTH || !/^[A-Za-z0-9_-]+$/.test(cursor)) return null;
  try {
    const value: unknown = JSON.parse(fromBase64Url(cursor));
    if (!Array.isArray(value) || value.length !== 2) return null;
    const [playedAt, clientGameId] = value;
    if (typeof playedAt !== 'number' || !Number.isSafeInteger(playedAt) || playedAt < 0) return null;
    if (!isValidClientGameId(clientGameId)) return null;
    return { playedAt, clientGameId };
  } catch {
    return null;
  }
}

function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === '') return ACCOUNT_LIMITS.HISTORY_PAGE_SIZE;
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > ACCOUNT_LIMITS.MAX_HISTORY_PAGE_SIZE) {
    throw new AccountError('invalid_input', `limit must be between 1 and ${ACCOUNT_LIMITS.MAX_HISTORY_PAGE_SIZE}`);
  }
  return n;
}

function parseClientGameId(value: unknown): string {
  if (!isValidClientGameId(value)) throw new AccountError('not_found', 'game not found');
  return value;
}

export interface GameHistoryQuery {
  cursor?: unknown;
  limit?: unknown;
}

export interface GameHistoryPage {
  games: ScoredGameResult[];
  /** Pass back to load the next (older) page; null on the last page. */
  nextCursor: string | null;
  /** Pinned games, only on the first page (no cursor), so the client can show them on top. */
  pinned?: ScoredGameResult[];
}

/** The player's full game history, newest first, keyset paginated. */
export class ListGameHistoryUseCase {
  constructor(private readonly results: IGameResultRepository) {}

  async execute(userId: string, query: GameHistoryQuery = {}): Promise<GameHistoryPage> {
    const limit = parseLimit(query.limit);
    let before: GameHistoryPosition | undefined;
    if (query.cursor !== undefined && query.cursor !== null && query.cursor !== '') {
      const decoded = typeof query.cursor === 'string' ? decodeHistoryCursor(query.cursor) : null;
      if (!decoded) throw new AccountError('invalid_input', 'invalid cursor');
      before = decoded;
    }

    // One extra row tells whether another page exists without a COUNT query.
    const [rows, pinned] = await Promise.all([
      this.results.listPage(userId, { before, limit: limit + 1 }),
      before ? Promise.resolve(undefined) : this.results.listPinned(userId),
    ]);
    const games = rows.slice(0, limit);
    const last = games[games.length - 1];
    const nextCursor = rows.length > limit && last ? encodeHistoryCursor(last) : null;
    return pinned ? { games, nextCursor, pinned } : { games, nextCursor };
  }
}

export interface PinGameOutput {
  clientGameId: string;
  pinnedAt: number;
}

/** Pins a game to the profile. Pinning a pinned game keeps its original pin time. */
export class PinGameUseCase {
  constructor(
    private readonly results: IGameResultRepository,
    private readonly clock: IClock
  ) {}

  async execute(userId: string, clientGameIdInput: unknown): Promise<PinGameOutput> {
    const clientGameId = parseClientGameId(clientGameIdInput);
    const pinned = await this.results.listPinned(userId);
    const existing = pinned.find((game) => game.clientGameId === clientGameId);
    if (existing?.pinnedAt != null) return { clientGameId, pinnedAt: existing.pinnedAt };
    // Soft limit: two concurrent pins can both pass this check; the cap is cosmetic, not security.
    if (pinned.length >= ACCOUNT_LIMITS.MAX_PINNED_GAMES) {
      throw new AccountError('quota_exceeded', `you can pin up to ${ACCOUNT_LIMITS.MAX_PINNED_GAMES} games`);
    }
    const pinnedAt = this.clock.now();
    if (!(await this.results.setPinned(userId, clientGameId, pinnedAt))) throw new AccountError('not_found', 'game not found');
    return { clientGameId, pinnedAt };
  }
}

/** Removes a pin. Unpinning a game that is not pinned is a no-op. */
export class UnpinGameUseCase {
  constructor(private readonly results: IGameResultRepository) {}

  async execute(userId: string, clientGameIdInput: unknown): Promise<void> {
    const clientGameId = parseClientGameId(clientGameIdInput);
    if (!(await this.results.setPinned(userId, clientGameId, null))) throw new AccountError('not_found', 'game not found');
  }
}
