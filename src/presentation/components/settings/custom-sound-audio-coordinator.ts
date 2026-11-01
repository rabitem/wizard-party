import type { CustomSound } from '@shared/domain';
import type { CustomSoundAudioLibrary } from '@/lib/sound/custom-sound-audio-library';

/**
 * Keeps custom sound audio out of the localStorage settings blob.
 *
 * Stored settings hold each sound's metadata; its audio is a `dataUrl` inline only while the
 * device audio library (IndexedDB) does not hold it yet: right after an upload or download, for
 * sounds saved by older app versions, and permanently where IndexedDB is unusable. At runtime
 * every sound carries its dataUrl as before, so playback and the wire protocol are unchanged.
 *
 * Invariants:
 * - A stored sound whose audio is not loaded yet (hydration pending, or written by another tab)
 *   is carried over by every save, so a save can never drop a sound the player cannot see.
 * - Inline audio moves to the library in the background; the settings are then rewritten
 *   without it.
 * - Audio is deleted from the library only when no settings document references it.
 */

type JsonRecord = Record<string, unknown>;

/** A custom sound as stored in the settings blob. */
export type StoredCustomSoundRecord = Omit<CustomSound, 'dataUrl'> & { dataUrl?: string };

/** The settings storage the coordinator works against (implemented by settings-persistence). */
export interface CustomSoundSettingsPort<S extends { customSounds: CustomSound[] }> {
  /** Stored settings JSON of the active settings key. */
  read(): unknown;
  write(stored: JsonRecord): void;
  /** Stored settings JSON of every key that may reference audio (player and sandbox settings). */
  readAll(): unknown[];
  /** Runtime settings from stored JSON whose sounds carry their audio. */
  normalize(stored: unknown): S;
  /** Stored shape of runtime settings (minus derived fields), before audio is replaced by references. */
  serialize(settings: S): JsonRecord;
  /** Tells the app that settings changed (sounds became playable). */
  announce(settings: S): void;
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function storedSoundRecords(stored: unknown): JsonRecord[] {
  if (!isJsonRecord(stored) || !Array.isArray(stored.customSounds)) return [];
  return stored.customSounds.filter(isJsonRecord);
}

function recordId(record: JsonRecord): string | null {
  return typeof record.id === 'string' ? record.id : null;
}

function withoutAudio(sound: CustomSound): StoredCustomSoundRecord {
  const { dataUrl: _audio, ...metadata } = sound;
  return metadata;
}

export class CustomSoundAudioCoordinator<S extends { customSounds: CustomSound[] }> {
  private hydration: Promise<void> | null = null;

  constructor(
    private readonly library: CustomSoundAudioLibrary,
    private readonly settings: CustomSoundSettingsPort<S>
  ) {}

  /** Stored JSON with every sound's audio filled in from the library where it is not inline. */
  withAudio(stored: unknown): unknown {
    if (!isJsonRecord(stored) || !Array.isArray(stored.customSounds)) return stored;
    return {
      ...stored,
      customSounds: stored.customSounds.map((record: unknown) => {
        if (!isJsonRecord(record) || typeof record.dataUrl === 'string') return record;
        const id = recordId(record);
        const dataUrl = id ? this.library.get(id) : undefined;
        return dataUrl ? { ...record, dataUrl } : record;
      }),
    };
  }

  /** Ids of stored sounds whose audio is neither inline nor loaded from the library. */
  unresolvedIds(stored: unknown): string[] {
    return storedSoundRecords(stored)
      .filter((record) => typeof record.dataUrl !== 'string')
      .map(recordId)
      .filter((id): id is string => id !== null && this.library.get(id) === undefined);
  }

  /** Runtime settings from stored JSON; asks the library for audio another tab may have stored. */
  resolve(stored: unknown): S {
    this.requestMissingAudio(stored);
    return this.settings.normalize(this.withAudio(stored));
  }

  /** The stored shape of `settings`: audio by reference where the library holds it. */
  toStored(settings: S, previous: unknown): JsonRecord {
    const ids = new Set(settings.customSounds.map((sound) => sound.id));
    const sounds: StoredCustomSoundRecord[] = settings.customSounds.map((sound) => (
      this.library.get(sound.id) === sound.dataUrl ? withoutAudio(sound) : sound
    ));
    const unresolved = new Set(this.unresolvedIds(previous));
    const carried = storedSoundRecords(previous).filter((record) => {
      const id = recordId(record);
      return id !== null && unresolved.has(id) && !ids.has(id);
    });
    return { ...this.settings.serialize(settings), customSounds: [...sounds, ...carried] };
  }

  /** Background work after a save: move inline audio to the library, release removed audio. */
  afterSave(previous: unknown, settings: S): void {
    this.storeInlineAudio(settings.customSounds);
    const kept = new Set(settings.customSounds.map((sound) => sound.id));
    const removed = storedSoundRecords(previous)
      .map(recordId)
      .filter((id): id is string => id !== null && !kept.has(id) && this.library.get(id) !== undefined);
    if (removed.length === 0) return;
    const referenced = this.referencedIds();
    for (const id of removed) {
      if (!referenced.has(id)) void this.library.delete(id);
    }
  }

  /** Stores the audio of a new sound before its settings are saved, so it never goes inline. */
  storeAudio(id: string, dataUrl: string): Promise<boolean> {
    return this.library.put(id, dataUrl);
  }

  /** Loads the library once, migrates inline audio and drops sounds whose audio is gone. */
  ensureHydrated(): Promise<void> {
    if (!this.hydration) {
      this.hydration = this.hydrate().catch((error: unknown) => {
        console.warn('[settings] custom sound audio could not be loaded', error);
      });
    }
    return this.hydration;
  }

  /** Resolves when every stored sound is readable; rejects when some are not (IndexedDB blocked). */
  async whenReadable(): Promise<void> {
    await this.ensureHydrated();
    const unresolved = this.unresolvedIds(this.settings.read());
    if (unresolved.length > 0) {
      throw new Error(`${unresolved.length} custom sound(s) cannot be read on this device`);
    }
  }

  private async hydrate(): Promise<void> {
    if (!(await this.library.hydrate())) return;
    // Records another tab stored after getAll() ran are fetched one by one before any is lost.
    await Promise.all(this.unresolvedIds(this.settings.read()).map((id) => this.library.load(id)));
    const stored = this.settings.read();
    if (!isJsonRecord(stored)) return;

    const lost = new Set(this.unresolvedIds(stored));
    if (lost.size > 0) console.warn(`[settings] ${lost.size} custom sound(s) lost their audio and were removed`);
    const remaining = {
      ...stored,
      customSounds: storedSoundRecords(stored).filter((record) => !lost.has(recordId(record) ?? '')),
    };
    const settings = this.settings.normalize(this.withAudio(remaining));
    this.settings.write(this.toStored(settings, remaining));
    this.storeInlineAudio(settings.customSounds);
    void this.library.prune(this.referencedIds());
    if (settings.customSounds.length > 0 || lost.size > 0) this.settings.announce(settings);
  }

  private storeInlineAudio(sounds: CustomSound[]): void {
    for (const sound of sounds) {
      if (this.library.get(sound.id) === sound.dataUrl) continue;
      void this.library.put(sound.id, sound.dataUrl).then((stored) => {
        if (stored) this.rewriteStored();
      });
    }
  }

  /** Rewrites the stored settings so audio now in the library is stored by reference. */
  private rewriteStored(): void {
    const stored = this.settings.read();
    if (!isJsonRecord(stored)) return;
    this.settings.write(this.toStored(this.settings.normalize(this.withAudio(stored)), stored));
  }

  private requestMissingAudio(stored: unknown): void {
    if (this.library.state !== 'ready') return;
    for (const id of this.unresolvedIds(stored)) {
      void this.library.load(id).then((loaded) => {
        if (loaded) this.settings.announce(this.settings.normalize(this.withAudio(this.settings.read())));
      });
    }
  }

  private referencedIds(): Set<string> {
    const ids = new Set<string>();
    for (const stored of this.settings.readAll()) {
      for (const record of storedSoundRecords(stored)) {
        const id = recordId(record);
        if (id) ids.add(id);
      }
    }
    return ids;
  }
}
