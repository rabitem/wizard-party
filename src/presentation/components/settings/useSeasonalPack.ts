'use client';

import { useCallback, useEffect, useState } from 'react';
import { applySeasonalThemePack, isSeasonalThemePackActive, type SeasonalThemePack } from './seasonal-theme-packs';
import { loadGameSettings, type GameSettings } from './settings-persistence';

export interface SeasonalPackState {
  /** Current saved settings; null until loaded on the client (avoids hydration mismatch) */
  settings: GameSettings | null;
  /** Saves the pack's theme, table and cards and broadcasts 'settings-changed' */
  applyPack: (pack: SeasonalThemePack) => void;
  isPackActive: (pack: SeasonalThemePack) => boolean;
}

/**
 * Tracks the saved look and applies theme packs outside the settings panel.
 * Uses the same applySeasonalThemePack path as SettingsPanel's SeasonalPackSection,
 * so ThemeProvider and the table/card hooks react to the shared 'settings-changed' event.
 */
export function useSeasonalPack(): SeasonalPackState {
  const [settings, setSettings] = useState<GameSettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setSettings(loadGameSettings());
    });
    const sync = () => setSettings(loadGameSettings());
    window.addEventListener('settings-changed', sync);
    return () => {
      cancelled = true;
      window.removeEventListener('settings-changed', sync);
    };
  }, []);

  const applyPack = useCallback((pack: SeasonalThemePack) => {
    setSettings(applySeasonalThemePack(pack));
  }, []);

  const isPackActive = useCallback(
    (pack: SeasonalThemePack) => (settings ? isSeasonalThemePackActive(settings, pack) : false),
    [settings]
  );

  return { settings, applyPack, isPackActive };
}
