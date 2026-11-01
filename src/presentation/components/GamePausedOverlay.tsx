'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IPauseState } from '@shared/domain';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';
import { EmberParticles, HourglassIcon, TimerDisplay, BotReplacementNotice, calculateTimeRemaining } from './overlays';
import { NAME_SCORE_TEXT_CLASS } from './name-score-layout';
import { SeasonalDivider, SeasonalEmblem } from './seasonal';

/** Decorative header flourish with animated center symbol */
function HeaderFlourish({ isUrgent }: { isUrgent: boolean }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
      <div className="h-px w-10 sm:w-16 bg-gradient-to-r from-transparent via-amber-600/40 to-amber-700/20" />
      <motion.div className="text-amber-500/70 text-sm sm:text-base" animate={isUrgent ? { opacity: [0.7, 1, 0.7], scale: [1, 1.1, 1] } : {}} transition={{ duration: 1, repeat: Infinity }}><SeasonalEmblem size={18} /></motion.div>
      <div className="h-px w-10 sm:w-16 bg-gradient-to-l from-transparent via-amber-600/40 to-amber-700/20" />
    </div>
  );
}

/** Pause title and subtitle divider */
function PauseTitle({ isWaitingForMe, isUrgent }: { isWaitingForMe: boolean; isUrgent: boolean }) {
  return (
    <>
      <h2 className="text-lg sm:text-xl text-center mb-2 tracking-wide" style={{ fontFamily: 'Georgia, serif', color: isUrgent ? '#e8a89a' : '#e8d5b5', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
        {isWaitingForMe ? 'Return to Battle' : 'A Champion Has Departed'}
      </h2>
      <div className="flex items-center justify-center gap-2 mb-4 sm:mb-5">
        <div className="h-px w-6 sm:w-8 bg-gradient-to-r from-transparent to-amber-700/30" />
        <span className="text-amber-700/50 text-xs">&#10022;</span>
        <div className="h-px w-6 sm:w-8 bg-gradient-to-l from-transparent to-amber-700/30" />
      </div>
    </>
  );
}

/** Player message section */
function PlayerMessage({ isWaitingForMe, playerName }: { isWaitingForMe: boolean; playerName: string }) {
  return (
    <div className="text-center mb-5 sm:mb-6 text-sm sm:text-base" style={{ fontFamily: 'Georgia, serif' }}>
      {isWaitingForMe ? <p className="text-amber-300/90">The realm awaits your return...</p> : (
        <p className="text-amber-200/70 min-w-0"><span className={`text-amber-300 font-medium inline-block max-w-[180px] align-bottom ${NAME_SCORE_TEXT_CLASS}`} title={playerName}>{playerName}</span> has left the battlefield</p>
      )}
    </div>
  );
}

/** Corner ornaments for desktop */
function CornerOrnaments() {
  return (
    <>
      <div className="hidden sm:block absolute top-4 left-4 text-amber-700/50 text-lg">&#10087;</div>
      <div className="hidden sm:block absolute top-4 right-4 text-amber-700/50 text-lg rotate-90">&#10087;</div>
      <div className="hidden sm:block absolute bottom-4 left-4 text-amber-700/50 text-lg -rotate-90">&#10087;</div>
      <div className="hidden sm:block absolute bottom-4 right-4 text-amber-700/50 text-lg rotate-180">&#10087;</div>
    </>
  );
}

/** Outer glow effect based on urgency */
function OuterGlow({ isUrgent }: { isUrgent: boolean }) {
  const bg = isUrgent
    ? 'radial-gradient(ellipse, rgba(168,70,50,0.25) 0%, transparent 70%)'
    : THEME_SURFACE.HALO;
  return <div className="absolute -inset-4 sm:-inset-6 rounded-lg blur-2xl sm:blur-3xl" style={{ background: bg }} />;
}

/** Bottom flourish decoration */
function BottomFlourish() {
  return (
    <div className="flex justify-center pb-4 sm:pb-5">
      <SeasonalDivider size={14} className="w-20 sm:w-24" />
    </div>
  );
}

/** Decorative border strips */
function TopBorder() {
  return <div className="h-1 sm:h-1.5" style={{ background: THEME_SURFACE.STRIP_TOP }} />;
}

function BottomBorder() {
  return <div className="h-1" style={{ background: THEME_SURFACE.STRIP_BOTTOM }} />;
}

interface GamePausedOverlayProps { pauseState: IPauseState | null; localPlayerId: string | null; }

export function GamePausedOverlay({ pauseState, localPlayerId }: GamePausedOverlayProps) {
  const [tick, setTick] = useState(0);
  const lastPausedAtRef = useRef<number | undefined>(undefined);

  // Track pause state changes and reset tick
  if (pauseState?.pausedAt !== lastPausedAtRef.current) {
    lastPausedAtRef.current = pauseState?.pausedAt;
    if (tick !== 0) {
      setTick(0);
    }
  }

  // Countdown timer
  useEffect(() => {
    if (!pauseState) return;

    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [pauseState]);

  const timeRemaining = useMemo(() => {
    if (!pauseState) return 0;
    const initial = calculateTimeRemaining(pauseState.pausedAt, pauseState.timeoutDuration);
    return Math.max(0, initial - tick);
  }, [pauseState, tick]);

  const progress = pauseState
    ? (timeRemaining / (pauseState.timeoutDuration / 1000)) * 100
    : 100;

  const isWaitingForMe = pauseState?.pausedForPlayerId === localPlayerId;
  const isUrgent = timeRemaining <= 30;

  return (
    <AnimatePresence>
      {pauseState ? <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: THEME_SURFACE.OVERLAY_BG,
            backdropFilter: 'blur(4px)',
          }}
        >
          {/* Floating ember particles */}
          <EmberParticles />

          {/* Vignette overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
            }}
          />

          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: -10 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="relative w-[92%] max-w-md">
            <OuterGlow isUrgent={isUrgent} />
            <div className="relative rounded-xl sm:rounded-lg overflow-hidden" style={{ background: THEME_SURFACE.DIALOG_BG, boxShadow: THEME_SURFACE.DIALOG_SHADOW }}>
              <TopBorder />
              <div className="hidden sm:block absolute inset-3 rounded border border-amber-900/30 pointer-events-none" />
              <CornerOrnaments />
              <div className="px-5 py-6 sm:px-8 sm:py-8">
                <HeaderFlourish isUrgent={isUrgent} />
                <HourglassIcon isUrgent={isUrgent} progress={progress} />
                <PauseTitle isWaitingForMe={isWaitingForMe} isUrgent={isUrgent} />
                <PlayerMessage isWaitingForMe={isWaitingForMe} playerName={pauseState.pausedForPlayerName} />
                <TimerDisplay timeRemaining={timeRemaining} progress={progress} isUrgent={isUrgent} />
                <BotReplacementNotice isWaitingForMe={isWaitingForMe} playerName={pauseState.pausedForPlayerName} />
              </div>
              <BottomFlourish />
              <BottomBorder />
            </div>
          </motion.div>
        </motion.div> : null}
    </AnimatePresence>
  );
}
