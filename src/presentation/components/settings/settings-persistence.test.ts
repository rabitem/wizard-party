import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AVATAR_PRESETS } from './avatar-presets';
import { CARD_THEMES } from './card-theme-presets';
import { TABLE_THEMES } from './visual-presets';
import {
  getRandomCustomSoundForRole,
  importSharedSoundAsCustom,
  isSharedSoundImported,
  loadGameSettings,
  saveGameSettings,
} from './settings-persistence';

const STORAGE_KEY = 'wizard-party-settings';

function installBrowserStorage() {
  const store = new Map<string, string>();
  const dispatchEvent = vi.fn((event: Event) => {
    void event;
    return true;
  });

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  });

  vi.stubGlobal('CustomEvent', class CustomEvent<T = unknown> {
    type: string;
    detail: T;

    constructor(type: string, init: { detail?: T } = {}) {
      this.type = type;
      this.detail = init.detail as T;
    }
  });

  vi.stubGlobal('window', { dispatchEvent });

  return { store, dispatchEvent };
}

describe('settings persistence', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    installBrowserStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns isolated default objects', () => {
    const first = loadGameSettings();
    first.theme = 'light';
    first.customTrickWinAudio = {
      id: 'custom',
      name: 'Custom',
      dataUrl: 'data:audio/wav;base64,AAAA',
      size: 20,
      duration: 1,
      category: 'custom',
      roles: { wizard: false, jester: false, trick: true, afk: false, shared: false },
    };
    first.customSounds.push(first.customTrickWinAudio);

    const second = loadGameSettings();

    expect(second.theme).toBe('dark');
    expect(AVATAR_PRESETS.some((preset) => preset.id === second.avatar)).toBe(true);
    expect(second.customTrickWinAudio).toBeNull();
    expect(second.customSounds).toEqual([]);
  });

  it('repairs invalid persisted settings', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      avatar: 'missing-avatar',
      cardTheme: 'missing-card-theme',
      tableTheme: 42,
      notificationsEnabled: 'yes',
      cardNumberSize: 'huge',
      wizardSound: 'wizardMissing',
      jesterSound: 'jesterMissing',
      trickWinSound: 'trickMissing',
      collectionAnimation: 'portal',
      theme: 'vaporwave',
      leaderboardPosition: 'center',
      leaderboardCompact: 'compact',
      customTrickWinAudio: {
        id: 123,
        name: null,
        dataUrl: 42,
        size: 'large',
        duration: {},
      },
      customSounds: [
        {
          id: 'broken-custom',
          name: '',
          dataUrl: 'data:audio/wav;base64,AAAA',
          size: 128,
          duration: 1,
          roles: { wizard: true },
        },
      ],
    }));

    const settings = loadGameSettings();

    expect(settings).toMatchObject({
      avatar: 'wizard',
      cardTheme: 'fantasy',
      tableTheme: 'default',
      notificationsEnabled: true,
      cardNumberSize: 'medium',
      wizardSound: 'random',
      jesterSound: 'random',
      trickWinSound: 'random',
      collectionAnimation: 'random',
      theme: 'dark',
      leaderboardPosition: 'right',
      leaderboardCompact: false,
    });
    expect(AVATAR_PRESETS.some((preset) => preset.id === settings.avatar)).toBe(true);
    expect(CARD_THEMES.some((theme) => theme.id === settings.cardTheme)).toBe(true);
    expect(TABLE_THEMES.some((theme) => theme.id === settings.tableTheme)).toBe(true);
    expect(settings.customTrickWinAudio).toBeNull();
    expect(settings.customSounds).toEqual([]);
  });

  it('maps retired sound ids to the sounds that replaced them', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      wizardSound: 'wizardJohnCena',
      jesterSound: 'jesterWindowsXpError',
      trickWinSound: 'trickWinHallelujah',
    }));

    expect(loadGameSettings()).toMatchObject({
      wizardSound: 'wizardTrumpetCall',
      jesterSound: 'jesterErrorBeep',
      trickWinSound: 'trickWinChoir',
    });
  });

  it('repairs persisted custom trick audio that no longer satisfies upload limits', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      customTrickWinAudio: {
        id: 'custom-too-large',
        name: 'too-large.wav',
        dataUrl: 'data:audio/wav;base64,AAAA',
        size: 3 * 1024 * 1024,
        duration: 1,
      },
    }));

    expect(loadGameSettings().customTrickWinAudio).toBeNull();
    expect(loadGameSettings().customSounds).toEqual([]);

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      customSounds: [
        {
          id: 'custom-too-long',
          name: 'too-long.wav',
          dataUrl: 'data:audio/wav;base64,AAAA',
          size: 128,
          duration: 30,
          roles: { wizard: true, jester: false, trick: false, afk: false, shared: false },
        },
      ],
    }));

    expect(loadGameSettings().customTrickWinAudio).toBeNull();
    expect(loadGameSettings().customSounds).toEqual([]);
  });

  it('migrates legacy custom trick audio into the custom sound manager list', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      customTrickWinAudio: {
        id: 'legacy-custom',
        name: 'legacy-win.wav',
        dataUrl: 'data:audio/wav;base64,AAAA',
        size: 128,
        duration: 1,
      },
    }));

    const settings = loadGameSettings();

    expect(settings.customSounds).toEqual([
      {
        id: 'legacy-custom',
        name: 'legacy-win.wav',
        dataUrl: 'data:audio/wav;base64,AAAA',
        size: 128,
        duration: 1,
        category: 'custom',
        roles: { wizard: false, jester: false, trick: true, afk: false, shared: false },
      },
    ]);
    expect(settings.customTrickWinAudio).toEqual(settings.customSounds[0]);
  });

  it('preserves custom sound roles and derives the first trick override', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      customSounds: [
        {
          id: 'custom-wizard',
          name: 'wizard.wav',
          dataUrl: 'data:audio/wav;base64,AAAA',
          size: 128,
          duration: 1,
          category: 'meme',
          roles: { wizard: true, jester: true, trick: false, afk: true, shared: true },
        },
        {
          id: 'custom-trick',
          name: 'trick.wav',
          dataUrl: 'data:audio/wav;base64,BBBB',
          size: 256,
          duration: 2,
          category: 'custom',
          roles: { wizard: false, jester: false, trick: true, afk: false, shared: false },
        },
      ],
    }));

    const settings = loadGameSettings();

    expect(settings.customSounds).toHaveLength(2);
    expect(settings.customSounds[0].roles).toEqual({ wizard: true, jester: true, trick: false, afk: true, shared: true });
    expect(settings.customSounds[0].category).toBe('meme');
    expect(settings.customTrickWinAudio?.id).toBe('custom-trick');
  });

  it('repairs unknown custom sound categories to custom', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      customSounds: [
        {
          id: 'custom-football',
          name: 'football.wav',
          dataUrl: 'data:audio/wav;base64,AAAA',
          size: 128,
          duration: 1,
          category: 'missing-category',
          roles: { wizard: true, jester: false, trick: false, afk: false, shared: false },
        },
      ],
    }));

    expect(loadGameSettings().customSounds[0]?.category).toBe('custom');
  });

  it('randomly selects one custom sound from the matching event role pool', () => {
    const settings = {
      ...loadGameSettings(),
      customSounds: [
        {
          id: 'wizard-1',
          name: 'wizard-one.wav',
          dataUrl: 'data:audio/wav;base64,AAAA',
          size: 128,
          duration: 1,
          category: 'sports' as const,
          roles: { wizard: true, jester: false, trick: false, afk: false, shared: false },
        },
        {
          id: 'wizard-2',
          name: 'wizard-two.wav',
          dataUrl: 'data:audio/wav;base64,BBBB',
          size: 128,
          duration: 1,
          category: 'sports' as const,
          roles: { wizard: true, jester: false, trick: false, afk: false, shared: false },
        },
      ],
    };
    vi.spyOn(Math, 'random').mockReturnValue(0.75);

    expect(getRandomCustomSoundForRole(settings, 'wizard')?.id).toBe('wizard-2');
  });

  it('imports shared party sounds as local custom sounds without auto-sharing them', () => {
    const sharedSound = {
      id: 'shared-1',
      ownerId: 'player-2',
      ownerName: 'Morgana',
      name: 'spell.wav',
      dataUrl: 'data:audio/wav;base64,AAAA',
      size: 128,
      duration: 1,
      category: 'football' as const,
      roles: { wizard: true, jester: false, trick: true, afk: true, shared: true },
    };

    const customSounds = importSharedSoundAsCustom([], sharedSound);

    expect(customSounds).toEqual([
      {
        id: 'imported-player-2-shared-1',
        name: 'spell.wav',
        dataUrl: 'data:audio/wav;base64,AAAA',
        size: 128,
        duration: 1,
        category: 'football',
        roles: { wizard: true, jester: false, trick: true, afk: true, shared: false },
      },
    ]);
    expect(isSharedSoundImported(customSounds, sharedSound)).toBe(true);
    expect(importSharedSoundAsCustom(customSounds, sharedSound)).toBe(customSounds);
  });

  it('stores each custom sound once: the trick override is derived, not persisted', () => {
    const trick = {
      id: 'custom-trick',
      name: 'trick.wav',
      dataUrl: 'data:audio/wav;base64,AAAA',
      size: 128,
      duration: 1,
      category: 'custom' as const,
      roles: { wizard: false, jester: false, trick: true, afk: false, shared: false },
    };

    saveGameSettings({ ...loadGameSettings(), customSounds: [trick] });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored).not.toHaveProperty('customTrickWinAudio');
    expect(stored.customSounds).toHaveLength(1);
    expect(loadGameSettings().customTrickWinAudio).toEqual(trick);
  });

  it('keeps applying and announcing settings when storage is full', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { dispatchEvent } = installBrowserStorage();
    const quotaError = Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' });
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw quotaError;
    });

    expect(() => saveGameSettings({ ...loadGameSettings(), theme: 'forest' })).not.toThrow();
    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(loadGameSettings().theme).toBe('forest');
  });

  it('preserves valid preset ids', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      avatar: 'dragon',
      cardTheme: 'classic',
      tableTheme: 'ocean',
      collectionAnimation: 'bladeDance',
    }));

    expect(loadGameSettings()).toMatchObject({
      avatar: 'dragon',
      cardTheme: 'classic',
      tableTheme: 'ocean',
      collectionAnimation: 'bladeDance',
    });
  });

  it('persists and dispatches normalized settings', () => {
    const dispatchEvent = vi.fn((event: Event) => {
      void event;
      return true;
    });
    vi.stubGlobal('window', { dispatchEvent });

    const saved = saveGameSettings({
      ...loadGameSettings(),
      theme: 'broken',
      leaderboardCompact: 'yes',
    } as never);

    expect(saved.theme).toBe('dark');
    expect(saved.leaderboardCompact).toBe(false);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').theme).toBe('dark');
    expect(dispatchEvent).toHaveBeenCalledOnce();
    const event = dispatchEvent.mock.calls[0]?.[0] as Event | undefined;
    expect(event).toMatchObject({
      type: 'settings-changed',
      detail: expect.objectContaining({ theme: 'dark' }),
    });
  });
});
