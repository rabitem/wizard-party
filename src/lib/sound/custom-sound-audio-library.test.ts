import { afterEach, describe, expect, it, vi } from 'vitest';

import { MemoryRecordStore, type AsyncRecordStore } from '../storage';
import { CustomSoundAudioLibrary, type CustomSoundAudioRecord } from './custom-sound-audio-library';
import { CUSTOM_SOUND_LIBRARY_CONFIG, exceedsCustomSoundLibraryCap } from './custom-sound-library.config';

const AUDIO = 'data:audio/wav;base64,AAAA';

class UnavailableStore implements AsyncRecordStore<CustomSoundAudioRecord> {
  get() { return Promise.reject(new Error('IndexedDB is not available')); }
  getAll() { return Promise.reject(new Error('IndexedDB is not available')); }
  getAllKeys() { return Promise.reject(new Error('IndexedDB is not available')); }
  put() { return Promise.reject(new Error('IndexedDB is not available')); }
  delete() { return Promise.reject(new Error('IndexedDB is not available')); }
}

describe('CustomSoundAudioLibrary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hydrates the cache from stored records', async () => {
    const store = new MemoryRecordStore<CustomSoundAudioRecord>();
    await store.put('a', { id: 'a', dataUrl: AUDIO });
    const library = new CustomSoundAudioLibrary(store);

    expect(library.get('a')).toBeUndefined();
    await expect(library.hydrate()).resolves.toBe(true);
    expect(library.state).toBe('ready');
    expect(library.get('a')).toBe(AUDIO);
  });

  it('stores audio durably and caches it', async () => {
    const store = new MemoryRecordStore<CustomSoundAudioRecord>();
    const library = new CustomSoundAudioLibrary(store);

    await expect(library.put('a', AUDIO)).resolves.toBe(true);

    expect(library.get('a')).toBe(AUDIO);
    expect(await store.get('a')).toEqual({ id: 'a', dataUrl: AUDIO });
  });

  it('reports unavailable storage instead of throwing', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const library = new CustomSoundAudioLibrary(new UnavailableStore());

    await expect(library.hydrate()).resolves.toBe(false);
    await expect(library.put('a', AUDIO)).resolves.toBe(false);
    await expect(library.load('a')).resolves.toBe(false);
    await expect(library.delete('a')).resolves.toBeUndefined();
    expect(library.state).toBe('unavailable');
    expect(library.get('a')).toBeUndefined();
  });

  it('loads a record another tab stored after hydration, and remembers absent ones', async () => {
    const store = new MemoryRecordStore<CustomSoundAudioRecord>();
    const library = new CustomSoundAudioLibrary(store);
    await library.hydrate();
    await store.put('late', { id: 'late', dataUrl: AUDIO });
    const get = vi.spyOn(store, 'get');

    await expect(library.load('late')).resolves.toBe(true);
    expect(library.get('late')).toBe(AUDIO);
    await expect(library.load('gone')).resolves.toBe(false);
    await expect(library.load('gone')).resolves.toBe(false);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('prunes records no settings reference', async () => {
    const store = new MemoryRecordStore<CustomSoundAudioRecord>();
    await store.put('kept', { id: 'kept', dataUrl: AUDIO });
    await store.put('orphan', { id: 'orphan', dataUrl: AUDIO });
    const library = new CustomSoundAudioLibrary(store);

    await library.prune(new Set(['kept']));

    expect(await store.getAllKeys()).toEqual(['kept']);
    expect(library.get('orphan')).toBeUndefined();
  });
});

describe('exceedsCustomSoundLibraryCap', () => {
  it('allows sounds up to the device total and rejects beyond it', () => {
    const half = CUSTOM_SOUND_LIBRARY_CONFIG.MAX_TOTAL_BYTES / 2;

    expect(exceedsCustomSoundLibraryCap([{ size: half }], half)).toBe(false);
    expect(exceedsCustomSoundLibraryCap([{ size: half }], half + 1)).toBe(true);
    expect(exceedsCustomSoundLibraryCap([{ size: Number.NaN }], 1)).toBe(false);
  });
});
