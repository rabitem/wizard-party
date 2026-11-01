'use client';

import { motion } from 'motion/react';
import { Crown } from 'lucide-react';

export function HeroSection() {
  return (
    <motion.header
      className="text-center mb-8 sm:mb-10"
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Logo mark */}
      <motion.div
        className="inline-flex items-center justify-center mb-3 sm:mb-4"
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="relative">
          <div className="absolute inset-0 blur-xl bg-amber-500/20 rounded-full scale-150" />
          <div
            className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-2xl border-2 border-amber-600/50 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-amber-700) 30%, transparent) 0%, color-mix(in srgb, var(--color-amber-900) 20%, transparent) 100%)',
              boxShadow: '0 8px 32px color-mix(in srgb, var(--color-amber-700) 20%, transparent), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400" strokeWidth={1.5} />
          </div>
        </div>
      </motion.div>

      {/* Title */}
      <h1
        className="text-2xl sm:text-4xl md:text-5xl font-normal text-amber-50 mb-1.5 sm:mb-2"
        style={{
          fontFamily: 'Georgia, serif',
          textShadow: '0 2px 20px color-mix(in srgb, var(--accent-deep) 30%, transparent)',
        }}
      >
        Wizard Party
      </h1>

      {/* Tagline */}
      <p
        className="text-amber-400/60 text-xs sm:text-sm tracking-widest uppercase"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        Medieval Trick-Taking
      </p>
    </motion.header>
  );
}
