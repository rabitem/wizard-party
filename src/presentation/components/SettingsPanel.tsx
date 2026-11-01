'use client';

import { useCallback, useMemo, useState, useEffect, type CSSProperties } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate, PanInfo, useDragControls } from 'motion/react';
import { useSound, type SoundName } from '@/lib/sounds';
import { X, LogOut, Scroll, SlidersHorizontal } from 'lucide-react';
import { ScrollIndicator } from './ui';
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
import {
  createSettingsFeedbackParticles,
  getSettingsBackdropClass,
  getSettingsOverlayRootClass,
  getSettingsPanelClass,
  shouldTriggerSettingsFeedback,
  type SettingsFeedbackAction,
} from './settings/settings-panel-feedback';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';
import { CONSTANTS } from '@/presentation/config/constants';
import { useAccount } from '@/presentation/providers/AccountProvider';
import { SeasonalCorner, SeasonalEmblem } from '@/presentation/components/seasonal';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLeaveGame?: () => void;
  showLeaveGame?: boolean;
}

/** Settings panel header with title and close button */
function SettingsHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="sticky top-0 border-b-2 border-amber-700/30 px-4 sm:px-6 py-4 sm:py-5 z-10" style={{ background: THEME_SURFACE.HEADER_BG, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
      <SeasonalCorner position="top-left" size={28} className="hidden md:block" />
      <div className="hidden md:block absolute top-2 right-12 opacity-70"><SeasonalEmblem size={14} /></div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <Scroll className="w-5 h-5 text-amber-500/70" />
          <h2 className="text-lg sm:text-xl text-amber-200/90 tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>Settings</h2>
        </div>
        <button onClick={onClose} className="relative p-2 transition-all cursor-pointer group" style={{ background: THEME_SURFACE.CONTROL_BG }}>
          <div className="absolute inset-0 rounded border border-amber-800/40 group-hover:border-amber-700/50 transition-colors" />
          <X className="w-5 h-5 text-amber-500/70 group-hover:text-amber-400 relative" />
        </button>
      </div>
      <div className="flex items-center justify-center gap-3 mt-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-700/30 to-amber-700/20" />
        <SeasonalEmblem size={12} className="opacity-70" />
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-700/30 to-amber-700/20" />
      </div>
    </div>
  );
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

/** Mobile drag handle */
function MobileDragHandle({ isMobile, dragControls }: { isMobile: boolean; dragControls: ReturnType<typeof useDragControls> }) {
  return (
    <div className="md:hidden flex justify-center pt-3 pb-1 touch-none cursor-grab active:cursor-grabbing"
      onPointerDown={(e) => isMobile && dragControls.start(e)}>
      <div className="w-10 h-1 rounded-full bg-amber-600/40" />
    </div>
  );
}

/** Bottom flourish and safe area */
function BottomFlourish() {
  return (<>
    <div className="flex justify-center pt-4 pb-2"><SeasonalEmblem size={14} className="opacity-70" /></div>
    <div className="h-6 md:h-0" />
  </>);
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
  showLeaveGame?: boolean; onLeaveGame?: () => void; onClose: () => void; isMobile: boolean;
  onFeedbackAction: (action: SettingsFeedbackAction) => void;
}

/** The quick, mid-game settings; the rest lives in Preferences (MorePreferencesLink). */
function SettingsContent({ gameSettings, updateGameSettings, soundSettings, setSoundSettings, sound, showLeaveGame, onLeaveGame, onClose, isMobile, onFeedbackAction }: SettingsContentProps) {
  const handleSelectPack = useCallback((pack: SoundPack) => {
    updateGameSettings(pack.sounds);
    if (pack.sounds.wizardSound !== 'random') sound.play(pack.sounds.wizardSound as SoundName, true);
    onFeedbackAction('sound-selection');
  }, [onFeedbackAction, sound, updateGameSettings]);

  return (
    <ScrollIndicator className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6" maxHeight={isMobile ? 'calc(90vh - 120px)' : 'calc(100vh - 140px)'}>
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
      <BottomFlourish />
    </ScrollIndicator>
  );
}

/** Panel background decorations */
function PanelBackground() {
  return (<>
    <div className="absolute inset-0" style={{ background: THEME_SURFACE.PANEL_BG }} />
    <div className="hidden md:block absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-700/40 via-amber-600/30 to-amber-700/40" />
    <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-amber-900/20 to-transparent pointer-events-none" />
  </>);
}

export function SettingsPanel({ isOpen, onClose, onLeaveGame, showLeaveGame }: SettingsPanelProps) {
  const sound = useSound();
  const [soundSettings, setSoundSettings] = useState(sound.getSettings());
  const { gameSettings, updateGameSettings } = useGameSettingsState();
  const [isMobile, setIsMobile] = useState(false);
  const [feedbackSeed, setFeedbackSeed] = useState<number | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile(); window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = orig; };
  }, [isOpen]);

  const y = useMotionValue(0);
  const opacity = useTransform(y, (v) => typeof v !== 'number' || !Number.isFinite(v) ? 1 : Math.max(0, Math.min(1, 1 - v / 300)));
  const dragControls = useDragControls();

  const handleDragEnd = (_: never, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) { animate(y, 500, { type: 'spring', damping: 30, stiffness: 300 }); setTimeout(onClose, 200); }
    else animate(y, 0, { type: 'spring', damping: 30, stiffness: 300 });
  };

  const handleFeedbackAction = useCallback((action: SettingsFeedbackAction) => {
    if (!shouldTriggerSettingsFeedback(action)) return;
    setFeedbackSeed((current) => (current ?? 0) + 1);
  }, []);
  const panelClass = getSettingsPanelClass(isMobile);

  return (
    <AnimatePresence>
      {isOpen ? <motion.div
        key="settings-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={getSettingsOverlayRootClass()}
      >
        <motion.div key="settings-backdrop" onClick={onClose} className={getSettingsBackdropClass()} />
        <motion.div initial={isMobile ? { y: '100%' } : { opacity: 0, x: 300 }} animate={isMobile ? { y: 0 } : { opacity: 1, x: 0 }}
          exit={isMobile ? { y: '100%' } : { opacity: 0, x: 300 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          style={isMobile ? { y, opacity } : undefined} drag={isMobile ? 'y' : false} dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }} onDragEnd={isMobile ? handleDragEnd : undefined} dragListener={false} dragControls={dragControls}
          onClick={(event) => event.stopPropagation()} className={panelClass}>
          <PanelBackground />
          <div className="relative h-full flex flex-col">
            {feedbackSeed !== null ? <SettingsFeedbackBurst seed={feedbackSeed} onDone={() => setFeedbackSeed(null)} /> : null}
            <MobileDragHandle isMobile={isMobile} dragControls={dragControls} />
            <SettingsHeader onClose={onClose} />
            <SettingsContent gameSettings={gameSettings} updateGameSettings={updateGameSettings} soundSettings={soundSettings}
              setSoundSettings={setSoundSettings} sound={sound}
              showLeaveGame={showLeaveGame} onLeaveGame={onLeaveGame} onClose={onClose} isMobile={isMobile}
              onFeedbackAction={handleFeedbackAction} />
          </div>
        </motion.div>
      </motion.div> : null}
    </AnimatePresence>
  );
}
