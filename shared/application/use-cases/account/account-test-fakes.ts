import { EMPTY_STATS, type PlayerProfile, type PlayerStatsSummary, type ProfileChanges } from '../../../domain/account';
import type { TournamentParticipation } from '../../../domain/tournament';
import type {
  GameHistoryPageQuery,
  IClock,
  IGameResultRepository,
  IPlayerProgressRepository,
  IProfileRepository,
  ITournamentParticipationReader,
  NewGameResult,
  PlayerProgressState,
  ScoredGameResult,
} from '../../ports/account';

/* In-memory adapters for the account use case tests. Deliberately simple: no indexes, no SQL. */

/** Mirrors the Postgres adapter: oldest first by (playedAt, clientGameId); pages newest first. */
export class MemoryGameResults implements IGameResultRepository {
  rows = new Map<string, ScoredGameResult[]>();

  async insertMany(userId: string, results: readonly NewGameResult[]) {
    const list = this.rows.get(userId) ?? [];
    const fresh = results.filter((r) => !list.some((s) => s.clientGameId === r.clientGameId));
    this.rows.set(userId, [...list, ...fresh.map((r) => ({ ...r, pinnedAt: null }))]);
    return fresh.map((r) => r.clientGameId);
  }
  async listAll(userId: string) {
    return [...(this.rows.get(userId) ?? [])].sort((a, b) => a.playedAt - b.playedAt || a.clientGameId.localeCompare(b.clientGameId));
  }
  async listRecent(userId: string, limit: number) {
    return (await this.listAll(userId)).reverse().slice(0, limit);
  }
  async listPage(userId: string, { before, limit }: GameHistoryPageQuery) {
    const newestFirst = (await this.listAll(userId)).reverse();
    const older = before
      ? newestFirst.filter((r) => r.playedAt < before.playedAt || (r.playedAt === before.playedAt && r.clientGameId < before.clientGameId))
      : newestFirst;
    return older.slice(0, limit);
  }
  async listPinned(userId: string) {
    return (this.rows.get(userId) ?? []).filter((r) => r.pinnedAt !== null).sort((a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0));
  }
  async countPinned(userId: string) {
    return (await this.listPinned(userId)).length;
  }
  async setPinned(userId: string, clientGameId: string, pinnedAt: number | null) {
    const row = (this.rows.get(userId) ?? []).find((r) => r.clientGameId === clientGameId);
    if (!row) return false;
    row.pinnedAt = pinnedAt;
    return true;
  }
}

export class MemoryProgress implements IPlayerProgressRepository {
  state = new Map<string, PlayerProgressState>();
  snapshots = new Map<string, { summary: PlayerStatsSummary; xp: number }>();

  constructor(private readonly clock: IClock) {}

  async get(userId: string) {
    return this.state.get(userId) ?? { baseline: EMPTY_STATS, baselineXp: 0, baselineImportedAt: null, unlocked: new Map() };
  }
  async saveSnapshot(userId: string, summary: PlayerStatsSummary, xp: number) {
    this.snapshots.set(userId, { summary, xp });
  }
  async setBaselineOnce(userId: string, baseline: PlayerStatsSummary, baselineXp: number) {
    const current = await this.get(userId);
    if (current.baselineImportedAt !== null) return false;
    this.state.set(userId, { ...current, baseline, baselineXp, baselineImportedAt: this.clock.now() });
    return true;
  }
  async unlock(userId: string, ids: readonly string[], at: number) {
    const current = await this.get(userId);
    const unlocked = new Map(current.unlocked);
    ids.forEach((id) => unlocked.set(id, at));
    this.state.set(userId, { ...current, unlocked });
  }
}

export class MemoryProfiles implements IProfileRepository {
  rows = new Map<string, PlayerProfile>();

  async get(userId: string) {
    return this.rows.get(userId) ?? null;
  }
  async ensure(profile: PlayerProfile) {
    const existing = this.rows.get(profile.userId);
    if (existing) return existing;
    this.rows.set(profile.userId, profile);
    return profile;
  }
  async update(userId: string, changes: ProfileChanges) {
    const next = { ...(this.rows.get(userId) as PlayerProfile), ...changes };
    this.rows.set(userId, next);
    return next;
  }
}

export class MemoryTournamentHistory implements ITournamentParticipationReader {
  rows = new Map<string, TournamentParticipation[]>();

  async participations(userId: string) {
    return this.rows.get(userId) ?? [];
  }
}
