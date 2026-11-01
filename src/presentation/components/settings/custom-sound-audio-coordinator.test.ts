import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CustomSound } from '@shared/domain';
import { MemoryRecordStore, type AsyncRecordStore } from '@/lib/storage';
import { CustomSoundAudioLibrary, type CustomSoundAudioRecord } from '@/lib/sound/custom-sound-audio-library';

import { CustomSoundAudioCoordinator, type CustomSoundSettingsPort } from './custom-sound-audio-coordinator';
import { customSoundsSetting } from './custom-sound-settings';

interface TestSettings {
  theme: string;
  customSounds: CustomSound[];
}

const ROLES = { wizard: true, jester: false, trick: false, afk: false, shared: false };
const sound = (id: string, dataUrl = `data:audio/wav;base64,${id.toUpperCase()}`): CustomSound => ({
  id, name: `${id}.wav`, dataUrl, size: 128, duration: 1, category: 'custom', roles: ROLES,
});
const flush = () => new Promise<void>((resolve) => {
  setTimeout(resolve, 0);
});

class UnavailableStore implements AsyncRecordStore<CustomSoundAudioRecord> {
  get() { return Promise.reject(new Error('blocked')); }
  getAll() { return Promise.reject(new Error('blocked')); }
  getAllKeys() { return Promise.reject(new Error('blocked')); }
  put() { return Promise.reject(new Error('blocked')); }
  delete() { return Promise.reject(new Error('blocked')); }
}

function setup(initial: unknown, store: AsyncRecordStore<CustomSoundAudioRecord> = new MemoryRecordStore()) {
  let stored: unknown = initial;
  const announce = vi.fn();
  const port: CustomSoundSettingsPort<TestSettings> = {
    read: () => stored,
    write: (next) => { stored = JSON.parse(JSON.stringify(next)); },
    readAll: () => [stored],
    normalize: (value) => {
      const record = (value ?? {}) as { theme?: unknown; customSounds?: unknown };
      return { theme: typeof record.theme === 'string' ? record.theme : 'dark', customSounds: customSoundsSetting(record.customSounds) };
    },
    serialize: (settings) => ({ ...settings }),
    announce,
  };
  const library = new CustomSoundAudioLibrary(store);
  const coordinator = new CustomSoundAudioCoordinator(library, port);
  const save = (settings: TestSettings) => {
    const previous = stored;
    port.write(coordinator.toStored(settings, previous));
    coordinator.afterSave(previous, settings);
  };
  return { coordinator, library, store, announce, save, stored: () => stored as { theme: string; customSounds: Array<Record<string, unknown>> } };
}

describe('CustomSoundAudioCoordinator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores an uploaded sound by reference, never its audio in the settings blob', async () => {
    const ctx = setup({ theme: 'dark', customSounds: [] });
    const upload = sound('a');

    await ctx.coordinator.storeAudio(upload.id, upload.dataUrl);
    ctx.save({ theme: 'dark', customSounds: [upload] });

    expect(ctx.stored().customSounds).toEqual([{ id: 'a', name: 'a.wav', size: 128, duration: 1, category: 'custom', roles: ROLES }]);
    expect(ctx.coordinator.resolve(ctx.stored()).customSounds).toEqual([upload]);
  });

  it('migrates inline audio saved by older versions into the library once hydrated', async () => {
    const legacy = sound('legacy');
    const ctx = setup({ theme: 'forest', customSounds: [legacy] });

    await ctx.coordinator.ensureHydrated();
    await flush();

    expect(ctx.library.get('legacy')).toBe(legacy.dataUrl);
    expect(ctx.stored().customSounds[0]).not.toHaveProperty('dataUrl');
    expect(ctx.stored().theme).toBe('forest');
    expect(ctx.coordinator.resolve(ctx.stored()).customSounds).toEqual([legacy]);
    expect(ctx.announce).toHaveBeenCalled();
  });

  it('keeps sounds whose audio is not loaded yet when settings are saved before hydration', async () => {
    const store = new MemoryRecordStore<CustomSoundAudioRecord>();
    await store.put('a', { id: 'a', dataUrl: sound('a').dataUrl });
    const { dataUrl: _audio, ...reference } = sound('a');
    const ctx = setup({ theme: 'dark', customSounds: [reference] }, store);

    // Before hydration the sound is invisible to the app...
    expect(ctx.coordinator.resolve(ctx.stored()).customSounds).toEqual([]);
    // ...and a theme change saved now must not drop it.
    ctx.save({ theme: 'light', customSounds: [] });
    expect(ctx.stored().customSounds.map((record) => record.id)).toEqual(['a']);

    await ctx.coordinator.ensureHydrated();
    expect(ctx.coordinator.resolve(ctx.stored()).customSounds).toEqual([sound('a')]);
  });

  it('drops sounds whose audio is gone once the library is loaded', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { dataUrl: _audio, ...reference } = sound('lost');
    const ctx = setup({ theme: 'dark', customSounds: [reference, sound('inline')] });

    await ctx.coordinator.ensureHydrated();

    expect(ctx.stored().customSounds.map((record) => record.id)).toEqual(['inline']);
    await expect(ctx.coordinator.whenReadable()).resolves.toBeUndefined();
  });

  it('releases the audio of a removed sound', async () => {
    const ctx = setup({ theme: 'dark', customSounds: [] });
    await ctx.coordinator.storeAudio('a', sound('a').dataUrl);
    ctx.save({ theme: 'dark', customSounds: [sound('a')] });

    ctx.save({ theme: 'dark', customSounds: [] });
    await flush();

    expect(ctx.library.get('a')).toBeUndefined();
    expect(await ctx.store.getAllKeys()).toEqual([]);
  });

  it('keeps audio inline and stays readable where IndexedDB is unusable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const ctx = setup({ theme: 'dark', customSounds: [] }, new UnavailableStore());

    await expect(ctx.coordinator.storeAudio('a', sound('a').dataUrl)).resolves.toBe(false);
    ctx.save({ theme: 'dark', customSounds: [sound('a')] });
    await ctx.coordinator.ensureHydrated();

    expect(ctx.stored().customSounds[0]?.dataUrl).toBe(sound('a').dataUrl);
    await expect(ctx.coordinator.whenReadable()).resolves.toBeUndefined();
  });

  it('refuses to report sounds readable while some cannot be read on this device', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { dataUrl: _audio, ...reference } = sound('a');
    const ctx = setup({ theme: 'dark', customSounds: [reference] }, new UnavailableStore());

    await expect(ctx.coordinator.whenReadable()).rejects.toThrow('cannot be read');
    expect(ctx.stored().customSounds.map((record) => record.id)).toEqual(['a']);
  });
});
