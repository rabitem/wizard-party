'use client';

import { useEffect, useState } from 'react';

import { loadGameSettings } from '../settings';

/**
 * Whether opponents' characters stand at the table (the "Characters at the table" setting). Read
 * inside the canvas from the settings events, like the table theme.
 */
export function useTableCharacters(): boolean {
  const [enabled, setEnabled] = useState(() => (typeof window === 'undefined' ? true : loadGameSettings().tableCharacters));

  useEffect(() => {
    const syncFromStorage = () => setEnabled(loadGameSettings().tableCharacters);
    const handleSettingsChange = (event: Event) => {
      const next = (event as CustomEvent<{ tableCharacters?: boolean }>).detail?.tableCharacters;
      if (typeof next === 'boolean') setEnabled(next);
    };
    window.addEventListener('settings-changed', handleSettingsChange);
    window.addEventListener('storage', syncFromStorage);
    return () => {
      window.removeEventListener('settings-changed', handleSettingsChange);
      window.removeEventListener('storage', syncFromStorage);
    };
  }, []);

  return enabled;
}
