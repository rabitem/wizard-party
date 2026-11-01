'use client';

import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { useSound, type SoundName } from '@/lib/sounds';
import { LogOut, Scroll, SlidersHorizontal } from 'lucide-react';
import {
  type GameSettings,
  type SoundPack,
  SoundSection,
  CardThemeSection,
  CardNumberSizeSection,
  TableThemeSection,
  KeyboardShortcutsSection,
  LeaderboardSection,
  CollectionAnimationSection,
  useGameSettingsState,
} from './settings';
// By path: the drawer pulls in the seasonal ornaments, which hooks importing the barrel must not load.
import { SettingsDrawer } from './settings/SettingsDrawer';
import {
  createSettingsFeedbackParticles,
  shouldTriggerSettingsFeedback,
  type SettingsFeedbackAction,
} from './settings/settings-panel-feedback';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';
import { CONSTANTS } from '@/presentation/config/constants';
import { useAccount } from '@/presentation/providers/AccountProvider';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLeaveGame?: () => void;
  showLeaveGame?: boolean;
}

/** Leave game button section */
function LeaveGameSection({ onClose, onLeaveGame }: { onClose: () => void; onLeaveGame: () => void }) {
  return (
    <div className="pt-4 border-t-2 border-amber-800/20">
      <button onClick={() => { onClose(); onLeaveGame(); }} className="w-full flex items-center justify-center gap-2 py-3 rounded border-2 border-red-800/50 text-red-400/90 transition-all cursor-pointer hover:border-red-700/60 hover:text-red-300 text-sm sm:text-base" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-800) 30%, transparent) 0%, color-mix(in srgb, var(--color-amber-900) 20%, transparent) 100%)', fontFamily: 'Georgia, serif' }}>
        <LogOut className="w-5 h-5" />Abandon Battle
      </button>
      <p className="text-xs text-amber-600/40 text-center mt-2" style={{ fontFamily: 'Georgia, serif' }}>The battle will be paused for other warriors</p>
    </div>
  );
}

/**
 * Pointer to the settings that are set once, not mid-game. Opens in a new tab so the game keeps
 * its connection: the account's Preferences tab, or the home screen's sheet for guests.
 */
function MorePreferencesLink() {
  const { status } = useAccount();
  const href = status === 'signed-in' ? CONSTANTS.ROUTES.ACCOUNT_PREFERENCES : CONSTANTS.ROUTES.GUEST_PREFERENCES;
  return (
    <a href={href} target="_blank" rel="noopener" className="flex items-center gap-3 p-3 rounded border border-amber-800/30 text-amber-200/80 hover:border-amber-700/50 hover:text-amber-100 transition-colors" style={{ background: THEME_SURFACE.CARD_BG, fontFamily: 'Georgia, serif' }}>
      <SlidersHorizontal className="w-4 h-4 text-amber-500/60 flex-shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block text-sm">More preferences</span>
        <span className="block text-xs text-amber-600/60">Single sounds, uploads, notifications and app theme</span>
      </span>
    </a>
  );
}

function SettingsFeedbackBurst({ seed, onDone }: { seed: number; onDone: () => void }) {
  const particles = useMemo(() => createSettingsFeedbackParticles(`settings-${seed}`), [seed]);

  return (
    <div className="pointer-events-none absolute top-20 left-1/2 z-20" aria-hidden="true">
      <style>{`
        @keyframes settings-feedback-burst {
          0% { opacity: 0; transform: translate3d(-50%, 0, 0) scale(0.65) rotate(0deg); }
          15% { opacity: 1; }
          100% { opacity: 0; transform: translate3d(calc(-50% + var(--x)), var(--y), 0) scale(1) rotate(var(--rotate)); }
        }
      `}</style>
      {particles.map((particle, index) => (
        <span
          key={particle.id}
          onAnimationEnd={index === particles.length - 1 ? onDone : undefined}
          className="absolute block h-1.5 w-2 rounded-sm"
          style={{
            backgroundColor: particle.color,
            animation: `settings-feedback-burst ${particle.durationMs}ms ease-out ${particle.delayMs}ms both`,
            '--x': `${particle.x}px`,
            '--y': `${particle.y}px`,
            '--rotate': `${particle.rotate}deg`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}

interface SettingsContentProps {
  gameSettings: GameSettings; updateGameSettings: (updates: Partial<GameSettings>) => void;
  soundSettings: ReturnType<ReturnType<typeof useSound>['getSettings']>; setSoundSettings: (s: ReturnType<ReturnType<typeof useSound>['getSettings']>) => void;
  sound: ReturnType<typeof useSound>;
  showLeaveGame?: boolean; onLeaveGame?: () => void; onClose: () => void;
  onFeedbackAction: (action: SettingsFeedbackAction) => void;
}

/** The quick, mid-game settings; the rest lives in Preferences (MorePreferencesLink). */
function SettingsContent({ gameSettings, updateGameSettings, soundSettings, setSoundSettings, sound, showLeaveGame, onLeaveGame, onClose, onFeedbackAction }: SettingsContentProps) {
  const handleSelectPack = useCallback((pack: SoundPack) => {
    updateGameSettings(pack.sounds);
    if (pack.sounds.wizardSound !== 'random') sound.play(pack.sounds.wizardSound as SoundName, true);
    onFeedbackAction('sound-selection');
  }, [onFeedbackAction, sound, updateGameSettings]);

  return (
    <>
      <SoundSection settings={soundSettings}
        sounds={{ wizardSound: gameSettings.wizardSound, jesterSound: gameSettings.jesterSound, trickWinSound: gameSettings.trickWinSound }}
        onToggleSound={() => { sound.setSoundEnabled(!soundSettings.enabled); setSoundSettings(sound.getSettings()); }}
        onToggleChaosMode={() => { sound.setChaosMode(!soundSettings.chaosMode); setSoundSettings(sound.getSettings()); }}
        onVolumeChange={(volume) => { sound.setSoundVolume(volume); setSoundSettings(sound.getSettings()); }}
        onSelectPack={handleSelectPack} />
      <CardThemeSection selectedTheme={gameSettings.cardTheme} onSelect={(themeId) => updateGameSettings({ cardTheme: themeId })} />
      <CardNumberSizeSection selectedSize={gameSettings.cardNumberSize} onSelect={(size) => updateGameSettings({ cardNumberSize: size })} />
      <TableThemeSection selectedTheme={gameSettings.tableTheme} onSelect={(tableTheme) => updateGameSettings({ tableTheme })} />
      <CollectionAnimationSection selectedMode={gameSettings.collectionAnimation} onSelect={(collectionAnimation) => updateGameSettings({ collectionAnimation })} />
      <LeaderboardSection position={gameSettings.leaderboardPosition} compact={gameSettings.leaderboardCompact}
        onPositionChange={(leaderboardPosition) => updateGameSettings({ leaderboardPosition })}
        onCompactChange={(leaderboardCompact) => updateGameSettings({ leaderboardCompact })} />
      <KeyboardShortcutsSection />
      <MorePreferencesLink />
      {showLeaveGame && onLeaveGame ? <LeaveGameSection onClose={onClose} onLeaveGame={onLeaveGame} /> : null}
    </>
  );
}

export function SettingsPanel({ isOpen, onClose, onLeaveGame, showLeaveGame }: SettingsPanelProps) {
  const sound = useSound();
  const [soundSettings, setSoundSettings] = useState(sound.getSettings());
  const { gameSettings, updateGameSettings } = useGameSettingsState();
  const [feedbackSeed, setFeedbackSeed] = useState<number | null>(null);

  const handleFeedbackAction = useCallback((action: SettingsFeedbackAction) => {
    if (!shouldTriggerSettingsFeedback(action)) return;
    setFeedbackSeed((current) => (current ?? 0) + 1);
  }, []);

  return (
    <SettingsDrawer isOpen={isOpen} onClose={onClose} title="Settings" icon={<Scroll className="w-5 h-5" />}
      overlay={feedbackSeed !== null ? <SettingsFeedbackBurst seed={feedbackSeed} onDone={() => setFeedbackSeed(null)} /> : null}>
      <SettingsContent gameSettings={gameSettings} updateGameSettings={updateGameSettings} soundSettings={soundSettings}
        setSoundSettings={setSoundSettings} sound={sound}
        showLeaveGame={showLeaveGame} onLeaveGame={onLeaveGame} onClose={onClose}
        onFeedbackAction={handleFeedbackAction} />
    </SettingsDrawer>
  );
}
