import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CARD_NUMBER_SIZE_PRESETS, type CardNumberSizePreset } from '@/presentation/components/settings/visual-presets';
// Warm the module graph at collection time: the tests re-import it after vi.resetModules(), and a cold
// transform inside a test body can exceed the 5s test timeout when the full suite runs in parallel.
import './card-theme-store';

const settings = vi.hoisted(() => ({ cardTheme: 'fantasy', cardNumberSize: 'medium', soundEnabled: true }));

vi.mock('@/presentation/components/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/presentation/components/settings')>();
  return {
    ...actual,
    loadGameSettings: () => ({ ...settings }),
  };
});

type Store = typeof import('./card-theme-store');

async function loadStore(): Promise<Store> {
  vi.resetModules();
  return import('./card-theme-store');
}

/** A fresh store in a page: it listens to the window events the settings panel and other tabs raise */
async function loadListeningStore(): Promise<Store> {
  vi.stubGlobal('window', new EventTarget());
  return loadStore();
}

/** What saving the settings does after writing them (settings-persistence announceSettings) */
function announceSavedSettings(): void {
  window.dispatchEvent(new Event('settings-changed'));
}

function numberSizePreset(id: string): CardNumberSizePreset {
  const preset = CARD_NUMBER_SIZE_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`Missing number size preset ${id}`);
  return preset;
}

describe('card theme store', () => {
  beforeEach(() => {
    settings.cardTheme = 'fantasy';
    settings.cardNumberSize = 'medium';
    settings.soundEnabled = true;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getCardThemeSnapshot', () => {
    it('should read the settings saved before the first access', async () => {
      settings.cardTheme = 'classic';
      const store = await loadStore();
      expect(store.getCardThemeSnapshot()).toEqual({ themeId: 'classic', numberSize: 'medium' });
    });

    it('should keep the snapshot until a sync, so textures and the version cannot disagree', async () => {
      const store = await loadStore();
      const before = store.getCardThemeSnapshot();
      settings.cardTheme = 'classic';
      expect(store.getCardThemeSnapshot()).toBe(before);
      expect(store.getActiveCardTheme().id).toBe('fantasy');
    });
  });

  describe('saving the settings (settings-changed)', () => {
    it('should notify subscribers when the card theme changed', async () => {
      const store = await loadListeningStore();
      store.getCardThemeSnapshot();
      const listener = vi.fn();
      store.subscribeCardTheme(listener);
      settings.cardTheme = 'classic';

      announceSavedSettings();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(store.getActiveCardTheme().id).toBe('classic');
      expect(store.cardThemeVersionOf(store.getCardThemeSnapshot())).toBe('classic-medium');
    });

    it('should notify subscribers when the number size changed', async () => {
      const store = await loadListeningStore();
      store.getCardThemeSnapshot();
      const listener = vi.fn();
      store.subscribeCardTheme(listener);
      settings.cardNumberSize = 'large';

      announceSavedSettings();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(store.getActiveCardNumberFontSizes()).toEqual(numberSizePreset('large').fontSizes);
    });

    it('should not notify or replace the snapshot for unrelated settings changes', async () => {
      const store = await loadListeningStore();
      const before = store.getCardThemeSnapshot();
      const listener = vi.fn();
      store.subscribeCardTheme(listener);
      settings.soundEnabled = false;

      announceSavedSettings();

      expect(listener).not.toHaveBeenCalled();
      expect(store.getCardThemeSnapshot()).toBe(before);
    });

    it('should stop notifying after unsubscribe', async () => {
      const store = await loadListeningStore();
      store.getCardThemeSnapshot();
      const listener = vi.fn();
      const unsubscribe = store.subscribeCardTheme(listener);
      unsubscribe();
      settings.cardTheme = 'classic';

      announceSavedSettings();

      expect(listener).not.toHaveBeenCalled();
      expect(store.getActiveCardTheme().id).toBe('classic');
    });
  });

  describe('window events', () => {
    it('should pick up a card theme saved in another tab (storage event)', async () => {
      vi.stubGlobal('window', new EventTarget());
      const store = await loadStore();
      const listener = vi.fn();
      store.subscribeCardTheme(listener);
      expect(store.getActiveCardTheme().id).toBe('fantasy');

      settings.cardTheme = 'classic';
      window.dispatchEvent(new Event('storage'));

      expect(listener).toHaveBeenCalledTimes(1);
      expect(store.getActiveCardTheme().id).toBe('classic');
    });

    it('should re-read the saved settings on settings-changed instead of trusting the event detail', async () => {
      vi.stubGlobal('window', new EventTarget());
      const store = await loadStore();
      store.getCardThemeSnapshot();

      settings.cardTheme = 'classic';
      window.dispatchEvent(new CustomEvent('settings-changed', { detail: { soundEnabled: false } }));

      expect(store.getCardThemeSnapshot()).toEqual({ themeId: 'classic', numberSize: 'medium' });
    });
  });

  describe('findCardTheme', () => {
    it('should fall back to the first theme for unknown ids', async () => {
      const store = await loadStore();
      expect(store.findCardTheme('missing').id).toBe('fantasy');
    });
  });
});
