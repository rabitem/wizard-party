'use client';

import { useEffect } from 'react';

import type { RecordGameResultsOutput } from '@shared/application/use-cases/account';

import { CustomSoundSync } from '@/lib/account/custom-sound-sync';
import { GameResultOutbox } from '@/lib/account/game-result-outbox';
import { setGameResultSink } from '@/lib/account/game-result-sink';
import { SettingsSyncEngine } from '@/lib/account/settings-sync-engine';
import { loadGameSettings, saveGameSettings, whenCustomSoundsReadable } from '@/presentation/components/settings';

import { SETTINGS_SYNC_SLICES } from './settings-sync-slices';

const SOUND_SYNC_DEBOUNCE_MS = 2_000;

function customSoundSignature(): string {
  return JSON.stringify(loadGameSettings().customSounds.map(({ id, name, category, roles }) => [id, name, category, roles]));
}

/**
 * Wires a signed-in player's browser to their account while they are signed in:
 * finished games go to the account outbox, settings and custom sounds sync both ways.
 * Signing out restores guest behaviour.
 */
export function useAccountSync(userId: string | null, onGamesRecorded: (output: RecordGameResultsOutput) => void): void {
  useEffect(() => {
    if (!userId) return;

    const outbox = new GameResultOutbox(userId, onGamesRecorded);
    const settings = new SettingsSyncEngine(userId, SETTINGS_SYNC_SLICES);
    const sounds = new CustomSoundSync(userId, {
      read: () => loadGameSettings().customSounds,
      write: (customSounds) => void saveGameSettings({ ...loadGameSettings(), customSounds }),
      // Until the device audio library is loaded, a sound missing from read() is not a deletion.
      ready: whenCustomSoundsReadable,
    });
    const report = (what: string) => (error: unknown) => console.warn(`[account] ${what} sync failed`, error);

    setGameResultSink(outbox);
    void outbox.flush();
    void settings.start().catch(report('settings'));
    void sounds.sync().catch(report('sound'));

    let soundSignature = customSoundSignature();
    let soundTimer: ReturnType<typeof setTimeout> | null = null;
    const onSettingsChanged = () => {
      const next = customSoundSignature();
      if (next === soundSignature) return;
      soundSignature = next;
      if (soundTimer) clearTimeout(soundTimer);
      soundTimer = setTimeout(() => void sounds.sync().catch(report('sound')), SOUND_SYNC_DEBOUNCE_MS);
    };
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void outbox.flush();
      void settings.reconcile().catch(report('settings'));
      void sounds.sync().catch(report('sound'));
    };
    const onOnline = () => void outbox.flush();

    window.addEventListener('settings-changed', onSettingsChanged);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);

    return () => {
      setGameResultSink(null);
      outbox.dispose();
      settings.stop();
      if (soundTimer) clearTimeout(soundTimer);
      window.removeEventListener('settings-changed', onSettingsChanged);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
    // onGamesRecorded is stable (useCallback in the provider); userId drives the lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
