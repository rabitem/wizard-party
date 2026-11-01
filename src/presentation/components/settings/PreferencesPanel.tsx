'use client';

import { useCallback } from 'react';
import type { SharedCustomSound } from '@shared/domain';
import { useSound, type SoundName } from '@/lib/sounds';

import { AudioUploadSection, type CustomAudio } from './AudioUploadSection';
import { NotificationsSection } from './NotificationsSection';
import { SeasonalPackSection } from './SeasonalPackSection';
import { SoundPicksSection } from './SoundPicksSection';
import { ThemeSection } from './ThemeSection';
import { importSharedSoundAsCustom, type GameSettings } from './settings-persistence';
import { useGameSettingsState } from './useGameSettingsState';
import { useRecentTableSounds } from './useRecentTableSounds';

/**
 * Everything that is set once rather than mid-game: single sound picks, uploads, sounds from
 * recent tables, notifications and the look of the app. Shown in the account's Preferences tab
 * and, for guests, in a sheet on the home screen. The in-game panel keeps the quick controls.
 */
export function PreferencesPanel() {
  const sound = useSound();
  const { gameSettings, updateGameSettings, applySeasonalPack, toggleNotifications } = useGameSettingsState();
  const recentSounds = useRecentTableSounds();

  const handleSoundSelection = useCallback((updates: Partial<GameSettings>, selectedSound: string) => {
    updateGameSettings(updates);
    if (selectedSound !== 'random') sound.play(selectedSound as SoundName, true);
  }, [sound, updateGameSettings]);
  const handleImportSharedSound = useCallback((sharedSound: SharedCustomSound) => {
    updateGameSettings({ customSounds: importSharedSoundAsCustom(gameSettings.customSounds, sharedSound) });
  }, [gameSettings.customSounds, updateGameSettings]);
  const importedSharedSoundIds = gameSettings.customSounds.map((customSound) => customSound.id).filter((id) => id.startsWith('imported-'));

  return (
    <div className="space-y-5 sm:space-y-6">
      <SoundPicksSection
        wizardSound={gameSettings.wizardSound}
        jesterSound={gameSettings.jesterSound}
        trickWinSound={gameSettings.trickWinSound}
        sharedCustomSounds={recentSounds}
        importedSharedSoundIds={importedSharedSoundIds}
        onWizardSoundChange={(wizardSound) => handleSoundSelection({ wizardSound }, wizardSound)}
        onJesterSoundChange={(jesterSound) => handleSoundSelection({ jesterSound }, jesterSound)}
        onTrickWinSoundChange={(trickWinSound) => handleSoundSelection({ trickWinSound }, trickWinSound)}
        onPreviewSound={(soundName) => sound.play(soundName, true)}
        onPreviewCustomSound={(dataUrl) => sound.playCustomAudio(dataUrl, true)}
        onImportSharedSound={handleImportSharedSound}
      />
      <AudioUploadSection
        customSounds={gameSettings.customSounds as CustomAudio[]}
        previewVolume={sound.getSettings().volume}
        onCustomSoundsChange={(customSounds) => updateGameSettings({ customSounds })}
      />
      <NotificationsSection enabled={gameSettings.notificationsEnabled} onToggle={toggleNotifications} />
      <SeasonalPackSection settings={gameSettings} onApply={applySeasonalPack} />
      <ThemeSection selectedTheme={gameSettings.theme} onSelect={(theme) => updateGameSettings({ theme })} />
    </div>
  );
}
