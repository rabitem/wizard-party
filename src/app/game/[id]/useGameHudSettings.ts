'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadGameSettings, type CollectionAnimationMode, type LeaderboardPosition } from '@/presentation/components/settings';

/** The game settings the in-game HUD reads (standings placement, trick collection animation). */
export interface GameHudSettings {
  leaderboardPosition: LeaderboardPosition;
  leaderboardCompact: boolean;
  collectionAnimation: CollectionAnimationMode;
}

const SERVER_HUD_SETTINGS: GameHudSettings = {
  leaderboardPosition: 'right',
  leaderboardCompact: false,
  collectionAnimation: 'random',
};

function readHudSettings(): GameHudSettings {
  if (typeof window === 'undefined') return SERVER_HUD_SETTINGS;
  const settings = loadGameSettings();
  return {
    leaderboardPosition: settings.leaderboardPosition,
    leaderboardCompact: settings.leaderboardCompact,
    collectionAnimation: settings.collectionAnimation,
  };
}

function isSameHudSettings(a: GameHudSettings, b: GameHudSettings): boolean {
  return a.leaderboardPosition === b.leaderboardPosition
    && a.leaderboardCompact === b.leaderboardCompact
    && a.collectionAnimation === b.collectionAnimation;
}

/**
 * HUD settings kept in sync with the settings panel (same tab), other tabs (storage events) and
 * the moment the settings panel closes.
 */
export function useGameHudSettings(settingsOpen: boolean): GameHudSettings {
  const [settings, setSettings] = useState<GameHudSettings>(readHudSettings);

  const syncSettings = useCallback(() => {
    const next = readHudSettings();
    setSettings((previous) => (isSameHudSettings(previous, next) ? previous : next));
  }, []);

  useEffect(() => {
    window.addEventListener('storage', syncSettings);
    window.addEventListener('settings-changed', syncSettings);
    return () => {
      window.removeEventListener('storage', syncSettings);
      window.removeEventListener('settings-changed', syncSettings);
    };
  }, [syncSettings]);

  const prevSettingsOpen = useRef(settingsOpen);
  useEffect(() => {
    let cancelled = false;
    if (prevSettingsOpen.current && !settingsOpen) {
      queueMicrotask(() => {
        if (!cancelled) syncSettings();
      });
    }
    prevSettingsOpen.current = settingsOpen;
    return () => {
      cancelled = true;
    };
  }, [settingsOpen, syncSettings]);

  return settings;
}
