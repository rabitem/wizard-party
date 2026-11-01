import 'server-only';

import { del, put } from '@vercel/blob';

import type { IAudioBlobStorage, StoredBlob } from '@shared/application/ports/account';

/**
 * Vercel Blob (public store, unguessable URLs). Clips are broadcast to other players anyway, so
 * public read access is fine; writes and deletes only happen server-side with the store token.
 */
export class VercelBlobAudioStorage implements IAudioBlobStorage {
  async put(path: string, bytes: Uint8Array, contentType: string): Promise<StoredBlob> {
    const blob = await put(path, Buffer.from(bytes), {
      access: 'public',
      contentType,
      addRandomSuffix: true,
      // URLs are immutable (random suffix) so caching is safe; bounded so deleted clips age out of browsers.
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    });
    return { url: blob.url, storageKey: blob.url };
  }

  async delete(storageKeys: readonly string[]): Promise<void> {
    if (storageKeys.length > 0) await del([...storageKeys]);
  }
}
