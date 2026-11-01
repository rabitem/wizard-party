import type { CustomSoundAssignments, SoundCategory } from '../../../domain/constants/sound-options';
import type { GameResult, PlayerProfile, PlayerStatsSummary, ProfileChanges } from '../../../domain/account';

/*
 * Ports of the account bounded context. Segregated by aggregate so adapters (Postgres today)
 * can be replaced one at a time, and use cases depend only on what they use.
 */

export interface ScoredGameResult extends GameResult {
  xp: number;
  /** When the player pinned this game to their profile, or null. */
  pinnedAt: number | null;
}

/** A result as recorded: pins are set afterwards by the player. */
export type NewGameResult = Omit<ScoredGameResult, 'pinnedAt'>;

/** Position in the history, newest first: (playedAt, clientGameId) of the last game seen. */
export interface GameHistoryPosition {
  playedAt: number;
  clientGameId: string;
}

export interface GameHistoryPageQuery {
  /** Only games strictly older than this position. */
  before?: GameHistoryPosition;
  limit: number;
}

export interface IGameResultRepository {
  /** Inserts results that are not stored yet and returns the ids that were new. */
  insertMany(userId: string, results: readonly NewGameResult[]): Promise<string[]>;
  /** Every result of the user, oldest first. */
  listAll(userId: string): Promise<ScoredGameResult[]>;
  listRecent(userId: string, limit: number): Promise<ScoredGameResult[]>;
  /** Keyset pagination, ordered by (playedAt, clientGameId) descending. */
  listPage(userId: string, query: GameHistoryPageQuery): Promise<ScoredGameResult[]>;
  /** Pinned games, most recently pinned first. */
  listPinned(userId: string): Promise<ScoredGameResult[]>;
  countPinned(userId: string): Promise<number>;
  /** Sets or clears (null) the pin; returns false when the game does not exist. */
  setPinned(userId: string, clientGameId: string, pinnedAt: number | null): Promise<boolean>;
}

export interface PlayerProgressState {
  baseline: PlayerStatsSummary;
  baselineXp: number;
  baselineImportedAt: number | null;
  unlocked: Map<string, number>;
}

export interface IPlayerProgressRepository {
  get(userId: string): Promise<PlayerProgressState>;
  /** Cached projection, so cheap reads (leaderboards, profile chips) need not recompute. */
  saveSnapshot(userId: string, summary: PlayerStatsSummary, totalXp: number): Promise<void>;
  /** Sets the imported baseline once; returns false if one was already imported. */
  setBaselineOnce(userId: string, baseline: PlayerStatsSummary, baselineXp: number): Promise<boolean>;
  unlock(userId: string, achievementIds: readonly string[], unlockedAt: number): Promise<void>;
}

export interface IProfileRepository {
  get(userId: string): Promise<PlayerProfile | null>;
  /** Creates the profile if missing and returns the stored one (first writer wins). */
  ensure(profile: PlayerProfile): Promise<PlayerProfile>;
  update(userId: string, changes: ProfileChanges): Promise<PlayerProfile>;
}

export interface AccountDocument {
  key: string;
  data: unknown;
  version: number;
  updatedAt: number;
}

export type SaveDocumentResult =
  | { ok: true; document: AccountDocument }
  | { ok: false; reason: 'conflict'; current: AccountDocument | null };

export interface IAccountDocumentRepository {
  list(userId: string): Promise<AccountDocument[]>;
  /**
   * Optimistic concurrency: `expectedVersion` 0 creates, any other value must match the stored
   * version. Mismatches return the current document so the caller can resolve.
   */
  save(userId: string, key: string, data: unknown, expectedVersion: number): Promise<SaveDocumentResult>;
}

export interface StoredCustomSound {
  /** Client-side sound id, stable across devices. */
  id: string;
  name: string;
  url: string;
  storageKey: string;
  size: number;
  duration: number;
  category: SoundCategory;
  roles: CustomSoundAssignments;
  createdAt: number;
}

export interface ICustomSoundRepository {
  list(userId: string): Promise<StoredCustomSound[]>;
  count(userId: string): Promise<number>;
  upsert(userId: string, sound: StoredCustomSound): Promise<void>;
  updateMetadata(userId: string, id: string, changes: Pick<StoredCustomSound, 'name' | 'category' | 'roles'>): Promise<boolean>;
  /** Removes the row and returns it, so the blob can be deleted too. */
  remove(userId: string, id: string): Promise<StoredCustomSound | null>;
}

export interface StoredBlob {
  url: string;
  storageKey: string;
}

/** Binary storage for user uploaded audio. */
export interface IAudioBlobStorage {
  put(path: string, bytes: Uint8Array, contentType: string): Promise<StoredBlob>;
  delete(storageKeys: readonly string[]): Promise<void>;
}

export interface IClock {
  now(): number;
}

export * from './public-profile.port';
export * from './leaderboard.port';
export * from './community-stats.port';
export * from './tournament-history.port';
