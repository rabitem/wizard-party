'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pause, Clock, UserX, Bot } from 'lucide-react';
import { IPauseState } from '@shared/domain';

interface GamePausedOverlayProps {
  pauseState: IPauseState | null;
  localPlayerId: string | null;
}

function calculateTimeRemaining(pausedAt: number, timeoutDuration: number): number {
  const elapsed = Date.now() - pausedAt;
  return Math.max(0, Math.ceil((timeoutDuration - elapsed) / 1000));
}

export function GamePausedOverlay({
  pauseState,
  localPlayerId,
}: GamePausedOverlayProps) {
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
  }, [pauseState?.pausedAt]);

  const timeRemaining = useMemo(() => {
    if (!pauseState) return 0;
    const initial = calculateTimeRemaining(pauseState.pausedAt, pauseState.timeoutDuration);
    return Math.max(0, initial - tick);
  }, [pauseState, tick]);

  const isWaitingForMe = pauseState?.pausedForPlayerId === localPlayerId;

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {pauseState && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-zinc-900/95 border border-zinc-700 rounded-2xl shadow-2xl p-6 w-[90%] max-w-md"
          >
            {/* Header */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="p-3 bg-amber-500/20 rounded-full">
                <Pause className="w-8 h-8 text-amber-400" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white text-center mb-2">
              Game Paused
            </h2>

            {/* Player info */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <UserX className="w-5 h-5 text-zinc-400" />
              <p className="text-zinc-300 text-center">
                {isWaitingForMe ? (
                  <span className="text-amber-400 font-medium">
                    Waiting for you to reconnect...
                  </span>
                ) : (
                  <>
                    <span className="text-white font-medium">
                      {pauseState.pausedForPlayerName}
                    </span>
                    {' '}has left the game
                  </>
                )}
              </p>
            </div>

            {/* Countdown */}
            <div className="bg-zinc-800/50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-zinc-400" />
                <span className="text-zinc-400">Time remaining</span>
              </div>
              <div className="text-4xl font-mono font-bold text-center text-white">
                {formatTime(timeRemaining)}
              </div>
              <div className="h-2 bg-zinc-700 rounded-full mt-3 overflow-hidden">
                <motion.div
                  className="h-full bg-amber-500"
                  initial={{ width: '100%' }}
                  animate={{
                    width: `${(timeRemaining / (pauseState.timeoutDuration / 1000)) * 100}%`,
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* What happens next */}
            <div className="flex items-start gap-3 text-sm text-zinc-400">
              <Bot className="w-5 h-5 text-zinc-500 mt-0.5 shrink-0" />
              <p>
                {isWaitingForMe ? (
                  'If you don\'t reconnect in time, you\'ll be replaced with a bot.'
                ) : (
                  `If ${pauseState.pausedForPlayerName} doesn't reconnect in time, they'll be replaced with a bot and the game will continue.`
                )}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
