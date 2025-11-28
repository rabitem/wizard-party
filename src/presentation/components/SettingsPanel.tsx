'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSound } from '@/lib/sounds';
import { X, LogOut } from 'lucide-react';
import {
  AVATAR_PRESETS,
  CARD_THEMES,
  TABLE_THEMES,
  loadGameSettings,
  saveGameSettings,
  type AvatarPreset,
  type GameSettings,
  SoundSection,
  NotificationsSection,
  AvatarSection,
  CardThemeSection,
  TableThemeSection,
  KeyboardShortcutsSection,
} from './settings';

// Re-export for backwards compatibility
export {
  AVATAR_PRESETS,
  CARD_THEMES,
  TABLE_THEMES,
  loadGameSettings,
  saveGameSettings,
  type AvatarPreset,
  type GameSettings,
};

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLeaveGame?: () => void;
  showLeaveGame?: boolean;
}

export function SettingsPanel({ isOpen, onClose, onLeaveGame, showLeaveGame }: SettingsPanelProps) {
  const sound = useSound();
  const [soundSettings, setSoundSettings] = useState(sound.getSettings());
  const [gameSettings, setGameSettings] = useState<GameSettings>(loadGameSettings);

  const updateGameSettings = (updates: Partial<GameSettings>) => {
    const newSettings = { ...gameSettings, ...updates };
    setGameSettings(newSettings);
    saveGameSettings(newSettings);
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      updateGameSettings({ notificationsEnabled: permission === 'granted' });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-[#12121f] to-[#0a0a12] border-l border-amber-500/20" />
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-amber-500/5 to-transparent" />

            <div className="relative h-full flex flex-col">
              {/* Header */}
              <div className="sticky top-0 bg-[#12121f]/90 backdrop-blur-sm border-b border-amber-500/10 px-6 py-5 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-amber-100">Settings</h2>
                <button
                  onClick={onClose}
                  className="p-2.5 hover:bg-amber-500/10 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-amber-500/20"
                >
                  <X className="w-5 h-5 text-amber-400/70" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <SoundSection
                  settings={soundSettings}
                  onToggleSound={() => {
                    sound.setSoundEnabled(!soundSettings.enabled);
                    setSoundSettings(sound.getSettings());
                  }}
                  onToggleMusic={() => {
                    sound.setMusicEnabled(!soundSettings.musicEnabled);
                    setSoundSettings(sound.getSettings());
                  }}
                  onVolumeChange={(volume) => {
                    sound.setSoundVolume(volume);
                    setSoundSettings(sound.getSettings());
                  }}
                  onMusicVolumeChange={(volume) => {
                    sound.setMusicVolume(volume);
                    setSoundSettings(sound.getSettings());
                  }}
                />

                <NotificationsSection
                  enabled={gameSettings.notificationsEnabled}
                  onToggle={requestNotificationPermission}
                />

                <AvatarSection
                  selectedAvatar={gameSettings.avatar}
                  onSelect={(avatarId) => updateGameSettings({ avatar: avatarId })}
                />

                <CardThemeSection
                  selectedTheme={gameSettings.cardTheme}
                  onSelect={(themeId) => updateGameSettings({ cardTheme: themeId })}
                />

                <TableThemeSection
                  selectedTheme={gameSettings.tableTheme}
                  onSelect={(themeId) => updateGameSettings({ tableTheme: themeId })}
                />

                <KeyboardShortcutsSection />

                {/* Leave Game Section */}
                {showLeaveGame && onLeaveGame && (
                  <div className="pt-4 border-t border-amber-500/10">
                    <button
                      onClick={() => {
                        onClose();
                        onLeaveGame();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-xl font-medium transition-colors cursor-pointer"
                    >
                      <LogOut className="w-5 h-5" />
                      Leave Game
                    </button>
                    <p className="text-xs text-zinc-500 text-center mt-2">
                      The game will be paused for other players
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
