'use client';

import { motion } from 'motion/react';

interface TimerDisplayProps {
  timeRemaining: number;
  progress: number;
  isUrgent: boolean;
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function TimerDisplay({ timeRemaining, progress, isUrgent }: TimerDisplayProps) {
  return (
    <div
      className="relative rounded-lg p-4 sm:p-5 mb-5 sm:mb-6"
      style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.4) 100%)',
        border: '1px solid color-mix(in srgb, var(--color-amber-800) 25%, transparent)',
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.3)',
      }}
    >
      {/* Timer label */}
      <div className="flex items-center justify-center gap-2 mb-2 sm:mb-3">
        <span
          className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] sm:tracking-[0.2em]"
          style={{ color: 'color-mix(in srgb, var(--accent) 50%, transparent)' }}
        >
          Time Remaining
        </span>
      </div>

      {/* Timer value */}
      <motion.div
        className="text-center mb-3 sm:mb-4"
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 'clamp(2rem, 8vw, 2.5rem)',
          fontWeight: 500,
          color: isUrgent ? '#e57373' : 'var(--accent)',
          textShadow: isUrgent
            ? '0 0 20px color-mix(in srgb, var(--color-amber-500) 40%, transparent)'
            : '0 0 20px color-mix(in srgb, var(--accent) 30%, transparent)',
          letterSpacing: '0.1em',
        }}
        animate={isUrgent ? {
          scale: [1, 1.02, 1],
          opacity: [1, 0.8, 1],
        } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      >
        {formatTime(timeRemaining)}
      </motion.div>

      {/* Progress bar */}
      <div
        className="h-1.5 sm:h-2 rounded-full overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 23%) 50%, transparent) 100%)',
          border: '1px solid color-mix(in srgb, var(--color-amber-800) 20%, transparent)',
        }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background: isUrgent
              ? 'linear-gradient(90deg, #a84632 0%, #c75050 50%, #a84632 100%)'
              : 'linear-gradient(90deg, var(--accent-brown) 0%, var(--accent) 50%, var(--accent-brown) 100%)',
            boxShadow: isUrgent
              ? '0 0 10px color-mix(in srgb, var(--color-amber-700) 50%, transparent)'
              : '0 0 10px color-mix(in srgb, var(--accent) 30%, transparent)',
          }}
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'linear' }}
        />
      </div>
    </div>
  );
}
