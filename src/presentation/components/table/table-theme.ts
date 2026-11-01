'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_TABLE_THEME_ID,
  getTableTheme,
  TABLE_THEME_PALETTES,
  type TableThemePalette,
} from '@/presentation/config/table-theme.config';
import { loadGameSettings } from '@/presentation/components/settings/settings-persistence';

export {
  DEFAULT_TABLE_THEME_ID,
  getTableTheme,
  TABLE_THEME_PALETTES,
  type TableThemePalette,
};

export function useSelectedTableTheme(): TableThemePalette {
  const [themeId, setThemeId] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_TABLE_THEME_ID;
    return loadGameSettings().tableTheme;
  });

  useEffect(() => {
    const syncFromStorage = () => setThemeId(loadGameSettings().tableTheme);
    const handleSettingsChange = (event: Event) => {
      const nextTheme = (event as CustomEvent<{ tableTheme?: string }>).detail?.tableTheme;
      if (nextTheme) setThemeId(nextTheme);
    };

    window.addEventListener('settings-changed', handleSettingsChange);
    window.addEventListener('storage', syncFromStorage);
    return () => {
      window.removeEventListener('settings-changed', handleSettingsChange);
      window.removeEventListener('storage', syncFromStorage);
    };
  }, []);

  return getTableTheme(themeId);
}
