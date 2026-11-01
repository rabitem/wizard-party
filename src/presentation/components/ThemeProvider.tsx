'use client';

import { useEffect } from 'react';
import { loadGameSettings, type ThemePreference } from './settings/settings-persistence';
import { THEME_PRESETS } from './settings/visual-presets';

const THEME_CLASSES = THEME_PRESETS.map((preset) => `theme-${preset.id}`);

/**
 * ThemeProvider applies the selected theme class to the HTML element.
 * It handles:
 * 1. Loading the saved theme from localStorage on mount
 * 2. Listening for settings-changed events to update the theme dynamically
 * 3. Applying the theme class to the <html> element for CSS variable switching
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply theme to HTML element
    const applyTheme = (theme: ThemePreference) => {
      const html = document.documentElement;
      // Remove all theme classes
      html.classList.remove(...THEME_CLASSES);
      // Add the selected theme class
      html.classList.add(`theme-${theme}`);
    };

    // Load and apply the saved theme on mount
    const settings = loadGameSettings();
    applyTheme(settings.theme);

    // Listen for settings changes
    const handleSettingsChange = (event: CustomEvent<{ theme?: ThemePreference }>) => {
      if (event.detail?.theme) {
        applyTheme(event.detail.theme);
      }
    };

    window.addEventListener('settings-changed', handleSettingsChange as EventListener);

    return () => {
      window.removeEventListener('settings-changed', handleSettingsChange as EventListener);
    };
  }, []);

  return children;
}
