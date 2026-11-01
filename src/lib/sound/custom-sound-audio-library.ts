import { IndexedDbRecordStore, type AsyncRecordStore } from '../storage';
import { CUSTOM_SOUND_LIBRARY_CONFIG } from './custom-sound-library.config';

/**
 * Audio is kept as the data URL the rest of the app already uses (playback, the wire protocol
 * for shared sounds, account upload). Strings also avoid WebKit's history of Blob-in-IndexedDB
 * bugs; IndexedDB has no 5 MB budget, so the base64 overhead does not matter here.
 */
export interface CustomSoundAudioRecord {
  id: string;
  dataUrl: string;
}

export type CustomSoundAudioLibraryState = 'idle' | 'loading' | 'ready' | 'unavailable';

function isAudioRecord(value: unknown): value is CustomSoundAudioRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<Record<keyof CustomSoundAudioRecord, unknown>>;
  return typeof record.id === 'string' && typeof record.dataUrl === 'string';
}

/**
 * Device-local audio of custom sounds, persisted in an AsyncRecordStore (IndexedDB) and mirrored
 * in a synchronous cache, so settings reads and playback never wait on IndexedDB.
 *
 * `hydrate()` loads every record once. Where IndexedDB is unusable the library reports
 * 'unavailable' and every put resolves false: callers then keep audio inline in settings.
 */
export class CustomSoundAudioLibrary {
  private readonly cache = new Map<string, string>();
  private readonly pendingPuts = new Map<string, Promise<boolean>>();
  private readonly lookups = new Map<string, Promise<boolean>>();
  /** Ids looked up after hydration and not found: never fetched again. */
  private readonly missing = new Set<string>();
  private hydration: Promise<boolean> | null = null;
  private status: CustomSoundAudioLibraryState = 'idle';

  constructor(private readonly store: AsyncRecordStore<CustomSoundAudioRecord>) {}

  get state(): CustomSoundAudioLibraryState {
    return this.status;
  }

  /** The cached audio of `id`; undefined until hydrated or when this device has none. */
  get(id: string): string | undefined {
    return this.cache.get(id);
  }

  /** Loads every stored record into the cache once. Resolves false when IndexedDB is unusable. */
  hydrate(): Promise<boolean> {
    if (!this.hydration) {
      this.status = 'loading';
      this.hydration = this.store.getAll().then(
        (records) => {
          for (const record of records) {
            if (isAudioRecord(record)) this.cache.set(record.id, record.dataUrl);
          }
          this.status = 'ready';
          return true;
        },
        (error: unknown) => {
          this.status = 'unavailable';
          console.warn('[sound] custom sound storage unavailable; sounds stay in settings', error);
          return false;
        }
      );
    }
    return this.hydration;
  }

  /** Stores audio durably. True once it is in IndexedDB and readable from the cache. */
  put(id: string, dataUrl: string): Promise<boolean> {
    if (this.cache.get(id) === dataUrl) return Promise.resolve(true);
    const pending = this.pendingPuts.get(id);
    if (pending) return pending;
    const putting = this.writeRecord(id, dataUrl).finally(() => {
      this.pendingPuts.delete(id);
    });
    this.pendingPuts.set(id, putting);
    return putting;
  }

  async delete(id: string): Promise<void> {
    this.cache.delete(id);
    if (!(await this.hydrate())) return;
    try {
      await this.store.delete(id);
    } catch {
      // A leftover record is removed by the next prune.
    }
  }

  /**
   * Fetches one record another tab stored after this tab hydrated. True when it is now cached.
   * Ids that turn out to be absent are remembered, so repeated reads cost nothing.
   */
  load(id: string): Promise<boolean> {
    if (this.cache.has(id)) return Promise.resolve(true);
    if (this.status !== 'ready' || this.missing.has(id)) return Promise.resolve(false);
    const existing = this.lookups.get(id);
    if (existing) return existing;
    const lookup = this.store.get(id).then(
      (record) => {
        if (isAudioRecord(record)) {
          this.cache.set(id, record.dataUrl);
          return true;
        }
        this.missing.add(id);
        return false;
      },
      () => false
    ).finally(() => {
      this.lookups.delete(id);
    });
    this.lookups.set(id, lookup);
    return lookup;
  }

  /** Deletes stored audio that no settings record references any more. */
  async prune(referencedIds: ReadonlySet<string>): Promise<void> {
    if (!(await this.hydrate())) return;
    let keys: string[];
    try {
      keys = await this.store.getAllKeys();
    } catch {
      return;
    }
    const unreferenced = keys.filter((key) => !referencedIds.has(key) && !this.pendingPuts.has(key));
    await Promise.all(unreferenced.map((key) => this.delete(key)));
  }

  private async writeRecord(id: string, dataUrl: string): Promise<boolean> {
    if (!(await this.hydrate())) return false;
    try {
      await this.store.put(id, { id, dataUrl });
    } catch (error) {
      console.warn('[sound] could not store custom sound audio', error);
      return false;
    }
    this.cache.set(id, dataUrl);
    this.missing.delete(id);
    return true;
  }
}

/** The device's custom sound audio, backed by IndexedDB (opened lazily on first use). */
export const customSoundAudioLibrary = new CustomSoundAudioLibrary(
  new IndexedDbRecordStore<CustomSoundAudioRecord>(
    CUSTOM_SOUND_LIBRARY_CONFIG.DATABASE_NAME,
    CUSTOM_SOUND_LIBRARY_CONFIG.STORE_NAME
  )
);
