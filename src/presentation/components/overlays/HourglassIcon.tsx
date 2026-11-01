'use client';

import { motion } from 'motion/react';

interface HourglassIconProps {
  isUrgent: boolean;
  progress: number;
}

export function HourglassIcon({ isUrgent, progress }: HourglassIconProps) {
  return (
    <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-5">
      {/* Outer decorative ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'conic-gradient(from 0deg, transparent 0%, color-mix(in srgb, var(--accent) 15%, transparent) 25%, transparent 50%, color-mix(in srgb, var(--accent) 15%, transparent) 75%, transparent 100%)',
        }}
      />
      <motion.div
        className="absolute inset-0 rounded-full border border-amber-800/40"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />

      {/* Inner circle */}
      <div
        className="absolute inset-2 rounded-full border border-amber-900/30"
        style={{
          background: 'radial-gradient(circle, color-mix(in srgb, var(--surface) 80%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 50%) 90%, transparent) 100%)',
        }}
      />

      {/* Hourglass SVG */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          className={isUrgent ? 'text-red-400/80' : 'text-amber-400/80'}
          animate={isUrgent ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          <path
            d="M6 2v4l4 4-4 4v4h12v-4l-4-4 4-4V2H6z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Sand top */}
          <motion.path
            d="M8 4h8v2l-4 4-4-4V4z"
            fill="currentColor"
            opacity={0.4}
            initial={{ scaleY: 1 }}
            animate={{ scaleY: progress / 100 }}
            style={{ transformOrigin: 'top' }}
          />
          {/* Sand bottom */}
          <motion.path
            d="M8 18h8v-2l-4-4-4 4v2z"
            fill="currentColor"
            opacity={0.4}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 - (progress / 100) }}
            style={{ transformOrigin: 'bottom' }}
          />
        </motion.svg>
      </div>
    </div>
  );
}
