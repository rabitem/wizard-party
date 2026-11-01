'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { loadGameSettings, saveGameSettings, type GameSettings } from './settings-persistence';
import { applySeasonalThemePack, type SeasonalThemePack } from './seasonal-theme-packs';
import {
  getBrowserNotificationPermission,
  getNotificationToggleAction,
  isNotificationPermissionGranted,
} from './settings-notifications';

/**
 * The settings a panel edits, kept in step with every other writer (seasonal packs, account
 * sync, another panel) through the `settings-changed` event.
 */
export function useGameSettingsState() {
  const [gameSettings, setGameSettings] = useState<GameSettings>(loadGameSettings);

  // Mirror of the latest settings so saves never merge onto a stale snapshot
  // (e.g. after a seasonal pack or another component changed settings).
  const latestSettingsRef = useRef(gameSettings);
  const commitGameSettings = useCallback((next: GameSettings) => {
    latestSettingsRef.current = next;
    setGameSettings(next);
  }, []);
  useEffect(() => {
    const handleSettingsChanged = (event: Event) => {
      const next = (event as CustomEvent<GameSettings>).detail;
      if (next && next !== latestSettingsRef.current) commitGameSettings(next);
    };
    window.addEventListener('settings-changed', handleSettingsChanged);
    return () => window.removeEventListener('settings-changed', handleSettingsChanged);
  }, [commitGameSettings]);

  const updateGameSettings = useCallback((updates: Partial<GameSettings>) => {
    commitGameSettings(saveGameSettings({ ...latestSettingsRef.current, ...updates }));
  }, [commitGameSettings]);

  // Same applySeasonalThemePack path as the home RealmSwitcher (useSeasonalPack); committing the
  // returned settings keeps the panel in sync even when localStorage is unavailable.
  const applySeasonalPack = useCallback((pack: SeasonalThemePack) => {
    commitGameSettings(applySeasonalThemePack(pack));
  }, [commitGameSettings]);

  const toggleNotifications = useCallback(async () => {
    const action = getNotificationToggleAction(latestSettingsRef.current.notificationsEnabled, getBrowserNotificationPermission());
    if (action.shouldRequestPermission && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      updateGameSettings({ notificationsEnabled: isNotificationPermissionGranted(permission) });
      return;
    }
    updateGameSettings({ notificationsEnabled: action.enabled });
  }, [updateGameSettings]);

  return { gameSettings, updateGameSettings, applySeasonalPack, toggleNotifications };
}
