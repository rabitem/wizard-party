'use client';

import { useCallback, useMemo, useRef, useState, useEffect, type CSSProperties } from 'react';
import type { SharedCustomSound } from '@shared/domain';
import { motion, AnimatePresence, useMotionValue, useTransform, animate, PanInfo, useDragControls } from 'motion/react';
import { useSound, type SoundName } from '@/lib/sounds';
import { X, LogOut, Scroll } from 'lucide-react';
import { ScrollIndicator } from './ui';
import {
  loadGameSettings,
  saveGameSettings,
  importSharedSoundAsCustom,
  type GameSettings,
  SoundSection,
  NotificationsSection,
  AvatarSection,
  CardThemeSection,
  CardNumberSizeSection,
  TableThemeSection,
  KeyboardShortcutsSection,
  ThemeSection,
  SeasonalPackSection,
  applySeasonalThemePack,
  type SeasonalThemePack,
  AudioUploadSection,
  LeaderboardSection,
  CollectionAnimationSection,
  type CustomAudio,
  type CustomSoundsChangeReason,
} from './settings';
import {
  createSettingsFeedbackParticles,
  getSettingsBackdropClass,
  getSettingsOverlayRootClass,
  getSettingsPanelClass,
  shouldTriggerSettingsFeedback,
  type SettingsFeedbackAction,
} from './settings/settings-panel-feedback';
import {
  getBrowserNotificationPermission,
  getNotificationToggleAction,
  isNotificationPermissionGranted,
} from './settings/settings-notifications';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';
import { SeasonalCorner, SeasonalEmblem } from '@/presentation/components/seasonal';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLeaveGame?: () => void;
  showLeaveGame?: boolean;
  sharedCustomSounds?: SharedCustomSound[];
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
  onApplySeasonalPack: (pack: SeasonalThemePack) => void;
  soundSettings: ReturnType<ReturnType<typeof useSound>['getSettings']>; setSoundSettings: (s: ReturnType<ReturnType<typeof useSound>['getSettings']>) => void;
  sound: ReturnType<typeof useSound>; onToggleNotifications: () => Promise<void>;
  showLeaveGame?: boolean; onLeaveGame?: () => void; onClose: () => void; isMobile: boolean;
  sharedCustomSounds: SharedCustomSound[];
  onFeedbackAction: (action: SettingsFeedbackAction) => void;
}

/** Settings content sections */
function SettingsContent({ gameSettings, updateGameSettings, onApplySeasonalPack, soundSettings, setSoundSettings, sound, onToggleNotifications, showLeaveGame, onLeaveGame, onClose, isMobile, sharedCustomSounds, onFeedbackAction }: SettingsContentProps) {
  const importedSharedSoundIds = gameSettings.customSounds.map((customSound) => customSound.id);
  const previewSelectedSound = useCallback((soundName: string) => {
    if (soundName !== 'random') sound.play(soundName as SoundName, true);
  }, [sound]);
  const handleSoundSelection = useCallback((updates: Partial<GameSettings>, selectedSound: string) => {
    updateGameSettings(updates);
    previewSelectedSound(selectedSound);
    onFeedbackAction('sound-selection');
  }, [onFeedbackAction, previewSelectedSound, updateGameSettings]);
  const handleImportSharedSound = useCallback((sharedSound: SharedCustomSound) => {
    updateGameSettings({
      customSounds: importSharedSoundAsCustom(gameSettings.customSounds, sharedSound),
    });
    onFeedbackAction('shared-import');
  }, [gameSettings.customSounds, onFeedbackAction, updateGameSettings]);
  const handleCustomSoundsChange = useCallback((customSounds: CustomAudio[], reason: CustomSoundsChangeReason) => {
    updateGameSettings({ customSounds });
    if (reason === 'role') onFeedbackAction('custom-role');
  }, [onFeedbackAction, updateGameSettings]);

  return (
    <ScrollIndicator className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6" maxHeight={isMobile ? 'calc(90vh - 120px)' : 'calc(100vh - 140px)'}>
      <SoundSection settings={soundSettings} wizardSound={gameSettings.wizardSound} jesterSound={gameSettings.jesterSound} trickWinSound={gameSettings.trickWinSound}
        sharedCustomSounds={sharedCustomSounds}
        importedSharedSoundIds={importedSharedSoundIds.filter((id) => id.startsWith('imported-'))}
        onToggleSound={() => { sound.setSoundEnabled(!soundSettings.enabled); setSoundSettings(sound.getSettings()); }}
        onToggleChaosMode={() => { sound.setChaosMode(!soundSettings.chaosMode); setSoundSettings(sound.getSettings()); }}
        onVolumeChange={(volume) => { sound.setSoundVolume(volume); setSoundSettings(sound.getSettings()); }}
        onWizardSoundChange={(wizardSound) => handleSoundSelection({ wizardSound }, wizardSound)}
        onJesterSoundChange={(jesterSound) => handleSoundSelection({ jesterSound }, jesterSound)}
        onTrickWinSoundChange={(trickWinSound) => handleSoundSelection({ trickWinSound }, trickWinSound)}
        onPreviewSound={(soundName) => sound.play(soundName, true)}
        onPreviewCustomSound={(dataUrl) => sound.playCustomAudio(dataUrl, true)}
        onImportSharedSound={handleImportSharedSound} />
      <AudioUploadSection customSounds={gameSettings.customSounds as CustomAudio[]}
        previewVolume={soundSettings.volume}
        onCustomSoundsChange={handleCustomSoundsChange} />
      <NotificationsSection enabled={gameSettings.notificationsEnabled} onToggle={onToggleNotifications} />
      <SeasonalPackSection settings={gameSettings} onApply={onApplySeasonalPack} />
      <ThemeSection selectedTheme={gameSettings.theme} onSelect={(theme) => updateGameSettings({ theme })} />
      <AvatarSection selectedAvatar={gameSettings.avatar} onSelect={(avatarId) => updateGameSettings({ avatar: avatarId })} />
      <CardThemeSection selectedTheme={gameSettings.cardTheme} onSelect={(themeId) => updateGameSettings({ cardTheme: themeId })} />
      <CardNumberSizeSection selectedSize={gameSettings.cardNumberSize} onSelect={(size) => updateGameSettings({ cardNumberSize: size })} />
      <TableThemeSection selectedTheme={gameSettings.tableTheme} onSelect={(tableTheme) => updateGameSettings({ tableTheme })} />
      <CollectionAnimationSection selectedMode={gameSettings.collectionAnimation} onSelect={(collectionAnimation) => updateGameSettings({ collectionAnimation })} />
      <KeyboardShortcutsSection />
      <LeaderboardSection position={gameSettings.leaderboardPosition} compact={gameSettings.leaderboardCompact}
        onPositionChange={(leaderboardPosition) => updateGameSettings({ leaderboardPosition })}
        onCompactChange={(leaderboardCompact) => updateGameSettings({ leaderboardCompact })} />
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

export function SettingsPanel({ isOpen, onClose, onLeaveGame, showLeaveGame, sharedCustomSounds = [] }: SettingsPanelProps) {
  const sound = useSound();
  const [soundSettings, setSoundSettings] = useState(sound.getSettings());
  const [gameSettings, setGameSettings] = useState<GameSettings>(loadGameSettings);
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
  const handleFeedbackAction = useCallback((action: SettingsFeedbackAction) => {
    if (!shouldTriggerSettingsFeedback(action)) return;
    setFeedbackSeed((current) => (current ?? 0) + 1);
  }, []);
  const toggleNotifications = async () => {
    const action = getNotificationToggleAction(gameSettings.notificationsEnabled, getBrowserNotificationPermission());
    if (action.shouldRequestPermission && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      updateGameSettings({ notificationsEnabled: isNotificationPermissionGranted(permission) });
      return;
    }
    updateGameSettings({ notificationsEnabled: action.enabled });
  };

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
            <SettingsContent gameSettings={gameSettings} updateGameSettings={updateGameSettings} onApplySeasonalPack={applySeasonalPack} soundSettings={soundSettings}
              setSoundSettings={setSoundSettings} sound={sound} onToggleNotifications={toggleNotifications}
              showLeaveGame={showLeaveGame} onLeaveGame={onLeaveGame} onClose={onClose} isMobile={isMobile}
              sharedCustomSounds={sharedCustomSounds} onFeedbackAction={handleFeedbackAction} />
          </div>
        </motion.div>
      </motion.div> : null}
    </AnimatePresence>
  );
}
