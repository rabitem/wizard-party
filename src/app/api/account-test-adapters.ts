/*
 * In-memory adapters for the account ports that have no fake in shared/ (documents, custom sounds,
 * audio blobs, public read models). Test-only: wired by api-test-support.ts for route tests.
 */
import type {
  AccountDocument,
  IAccountDocumentRepository,
  IAudioBlobStorage,
  ICommunityStatsReader,
  ICustomSoundRepository,
  ILeaderboardReader,
  IPublicProfileReader,
  SaveDocumentResult,
  StoredBlob,
  StoredCustomSound,
} from '@shared/application/ports/account';
import type { LeaderboardCandidate } from '@shared/domain/account/leaderboard';

/** Mirrors the Postgres adapter: version 0 creates, any other version must match the stored one. */
export class MemoryDocuments implements IAccountDocumentRepository {
  readonly rows = new Map<string, AccountDocument>();

  constructor(private readonly clock: { now(): number }) {}

  async list(userId: string): Promise<AccountDocument[]> {
    return [...this.rows].filter(([key]) => key.startsWith(`${userId}/`)).map(([, document]) => document);
  }

  async save(userId: string, key: string, data: unknown, expectedVersion: number): Promise<SaveDocumentResult> {
    const current = this.rows.get(`${userId}/${key}`) ?? null;
    if ((current?.version ?? 0) !== expectedVersion) return { ok: false, reason: 'conflict', current };
    const document = { key, data, version: expectedVersion + 1, updatedAt: this.clock.now() };
    this.rows.set(`${userId}/${key}`, document);
    return { ok: true, document };
  }
}

export class MemorySounds implements ICustomSoundRepository {
  readonly rows = new Map<string, StoredCustomSound>();

  async list(userId: string): Promise<StoredCustomSound[]> {
    return [...this.rows].filter(([key]) => key.startsWith(`${userId}/`)).map(([, sound]) => sound);
  }
  async count(userId: string): Promise<number> {
    return (await this.list(userId)).length;
  }
  async upsert(userId: string, sound: StoredCustomSound): Promise<void> {
    this.rows.set(`${userId}/${sound.id}`, sound);
  }
  async updateMetadata(userId: string, id: string, changes: Pick<StoredCustomSound, 'name' | 'category' | 'roles'>): Promise<boolean> {
    const sound = this.rows.get(`${userId}/${id}`);
    if (!sound) return false;
    this.rows.set(`${userId}/${id}`, { ...sound, ...changes });
    return true;
  }
  async remove(userId: string, id: string): Promise<StoredCustomSound | null> {
    const sound = this.rows.get(`${userId}/${id}`) ?? null;
    this.rows.delete(`${userId}/${id}`);
    return sound;
  }
}

export class MemoryBlobs implements IAudioBlobStorage {
  readonly objects = new Map<string, { bytes: Uint8Array; contentType: string }>();

  async put(path: string, bytes: Uint8Array, contentType: string): Promise<StoredBlob> {
    this.objects.set(path, { bytes, contentType });
    return { url: `https://blob.example.test/${path}`, storageKey: path };
  }
  async delete(storageKeys: readonly string[]): Promise<void> {
    for (const key of storageKeys) this.objects.delete(key);
  }
}

/** Read models the public routes serve; tests set what storage holds. */
export class StubReadModels implements ILeaderboardReader, ICommunityStatsReader, IPublicProfileReader {
  candidates: LeaderboardCandidate[] = [];
  community: Record<string, unknown> = {};
  failWith: Error | null = null;

  async listPublicCandidates(limit: number): Promise<LeaderboardCandidate[]> {
    if (this.failWith) throw this.failWith;
    return this.candidates.slice(0, limit);
  }
  async read(): Promise<Record<string, unknown>> {
    if (this.failWith) throw this.failWith;
    return this.community;
  }
  async findByUsername(): Promise<null> {
    return null;
  }
}
