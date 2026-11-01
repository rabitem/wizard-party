import type { CustomSound } from '@shared/domain';
import type { StoredCustomSound } from '@shared/application/ports/account';

import { safeLocalStorage } from '../storage';
import { AccountApiError, accountApi } from './account-api';

export interface CustomSoundStore {
  read(): CustomSound[];
  write(sounds: CustomSound[]): void;
  /**
   * Resolves once read() lists every local sound (audio kept in IndexedDB loads asynchronously);
   * rejects when some cannot be read on this device. Until then a sound missing from read() is
   * not a deletion, so the sync must not run.
   */
  ready?(): Promise<void>;
}

type Api = Pick<typeof accountApi, 'sounds' | 'uploadSound' | 'updateSound' | 'deleteSound'>;

const metadataOf = (sound: Pick<CustomSound, 'name' | 'category' | 'roles'>) => ({
  name: sound.name,
  category: sound.category,
  roles: sound.roles,
});

const sameMetadata = (a: Parameters<typeof metadataOf>[0], b: Parameters<typeof metadataOf>[0]) =>
  JSON.stringify(metadataOf(a)) === JSON.stringify(metadataOf(b));

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Two-way sync of uploaded sounds between this browser (data URLs in settings) and the account
 * (blob storage). Ids that were in sync last time are remembered, which tells a deletion on
 * one side apart from an addition on the other.
 */
export class CustomSoundSync {
  private readonly stateKey: string;
  private running: Promise<void> | null = null;
  private rerun = false;

  constructor(
    userId: string,
    private readonly store: CustomSoundStore,
    private readonly api: Api = accountApi,
    private readonly fetchBlob: (url: string) => Promise<Blob> = async (url) => (await fetch(url)).blob()
  ) {
    this.stateKey = `wizard-party-account-sounds:${userId}`;
  }

  /** Coalesces overlapping calls: at most one sync runs, one more is queued. */
  sync(): Promise<void> {
    if (this.running) {
      this.rerun = true;
      return this.running;
    }
    this.running = this.run().finally(() => {
      this.running = null;
      if (this.rerun) {
        this.rerun = false;
        void this.sync();
      }
    });
    return this.running;
  }

  private async run(): Promise<void> {
    await this.store.ready?.();
    const { sounds: remote } = await this.api.sounds();
    const synced = this.loadSyncedIds();
    const remoteById = new Map(remote.map((sound) => [sound.id, sound]));
    const local = this.store.read();
    const localById = new Map(local.map((sound) => [sound.id, sound]));

    const toDownload: StoredCustomSound[] = [];
    const deletedElsewhere = new Set<string>();

    for (const sound of remote) {
      if (localById.has(sound.id)) continue;
      if (synced.has(sound.id)) await this.api.deleteSound(sound.id);
      else toDownload.push(sound);
    }

    for (const sound of local) {
      const stored = remoteById.get(sound.id);
      if (!stored) {
        if (synced.has(sound.id)) deletedElsewhere.add(sound.id);
        else await this.upload(sound);
      } else if (!sameMetadata(sound, stored)) {
        await this.api.updateSound(sound.id, metadataOf(sound));
      }
    }

    const downloaded = (await Promise.all(toDownload.map((sound) => this.download(sound)))).filter(
      (sound): sound is CustomSound => sound !== null
    );

    if (downloaded.length > 0 || deletedElsewhere.size > 0) {
      // Re-read: the player may have changed sounds while requests were in flight.
      const current = this.store.read().filter((sound) => !deletedElsewhere.has(sound.id));
      const known = new Set(current.map((sound) => sound.id));
      this.store.write([...current, ...downloaded.filter((sound) => !known.has(sound.id))]);
    }

    const { sounds: after } = await this.api.sounds();
    const finalLocal = new Set(this.store.read().map((sound) => sound.id));
    this.saveSyncedIds(after.filter((sound) => finalLocal.has(sound.id)).map((sound) => sound.id));
  }

  private async upload(sound: CustomSound): Promise<void> {
    try {
      const blob = await this.fetchBlob(sound.dataUrl);
      await this.api.uploadSound(blob, { id: sound.id, duration: sound.duration, ...metadataOf(sound) });
    } catch (error) {
      // Over quota or rejected: the sound stays local-only on this device.
      if (!(error instanceof AccountApiError && error.status < 500)) throw error;
      console.warn(`[account] sound ${sound.name} not synced: ${error.message}`);
    }
  }

  private async download(sound: StoredCustomSound): Promise<CustomSound | null> {
    try {
      const dataUrl = await blobToDataUrl(await this.fetchBlob(sound.url));
      return { id: sound.id, name: sound.name, dataUrl, size: sound.size, duration: sound.duration, category: sound.category, roles: sound.roles };
    } catch (error) {
      console.warn(`[account] could not download sound ${sound.name}`, error);
      return null;
    }
  }

  private loadSyncedIds(): Set<string> {
    const ids = safeLocalStorage.readJson(this.stateKey);
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []);
  }

  private saveSyncedIds(ids: string[]): void {
    // Without the snapshot the next run treats everything as new, which only re-adds.
    safeLocalStorage.writeJson(this.stateKey, ids);
  }
}
