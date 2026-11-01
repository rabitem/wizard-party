'use client';

import { useSyncExternalStore } from 'react';
import type { ThemePreference } from '@/presentation/components/settings/settings-persistence';
import { THEME_PRESETS } from '@/presentation/components/settings/visual-presets';

const THEME_CLASS_PREFIX = 'theme-';
const DEFAULT_THEME: ThemePreference = 'dark';
const KNOWN_THEMES = new Set<string>(THEME_PRESETS.map((preset) => preset.id));

function readTheme(): ThemePreference {
  for (const cls of document.documentElement.classList) {
    if (cls.startsWith(THEME_CLASS_PREFIX)) {
      const id = cls.slice(THEME_CLASS_PREFIX.length);
      if (KNOWN_THEMES.has(id)) return id as ThemePreference;
    }
  }
  return DEFAULT_THEME;
}

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

const getServerSnapshot = (): ThemePreference => DEFAULT_THEME;

/**
 * The UI theme currently applied by ThemeProvider (the `.theme-<id>` class on <html>).
 * Server render and first paint report 'dark', then it follows the class live.
 */
export function useActiveTheme(): ThemePreference {
  return useSyncExternalStore(subscribe, readTheme, getServerSnapshot);
}
