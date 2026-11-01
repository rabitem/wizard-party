'use client';

import { motion } from 'motion/react';
import { BookOpen, ArrowRight } from 'lucide-react';

interface LearnToPlaySectionProps {
  onOpenTutorial: () => void;
}

export function LearnToPlaySection({ onOpenTutorial }: LearnToPlaySectionProps) {
  return (
    <motion.section
      className="mb-6 sm:mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
    >
      <button
        onClick={onOpenTutorial}
        className="w-full group relative flex items-center justify-between p-3 sm:p-4 rounded border border-amber-800/30 hover:border-amber-700/40 hover:bg-amber-900/10 transition-all cursor-pointer active:scale-[0.99]"
        style={{
          background: 'linear-gradient(180deg, color-mix(in srgb, color-mix(in srgb, var(--surface), black 5%) 80%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 31%) 80%, transparent) 100%)',
        }}
      >
        {/* Corner accents */}
        <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l border-amber-600/25 pointer-events-none" />
        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t border-r border-amber-600/25 pointer-events-none" />
        <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b border-l border-amber-600/25 pointer-events-none" />
        <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r border-amber-600/25 pointer-events-none" />
        <div className="flex items-center gap-3 relative">
          <div
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-dim) 30%, transparent) 0%, color-mix(in srgb, var(--color-amber-950) 20%, transparent) 100%)' }}
          >
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500/80" />
          </div>
          <div className="text-left">
            <div className="text-amber-100/90 text-sm sm:text-base" style={{ fontFamily: 'Georgia, serif' }}>
              New to Wizard?
            </div>
            <div className="text-amber-200/75 text-xs" style={{ fontFamily: 'Georgia, serif' }}>
              Learn the rules in 2 minutes
            </div>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-amber-600/40 group-hover:text-amber-400 group-hover:translate-x-1 transition-all relative" />
      </button>
    </motion.section>
  );
}
