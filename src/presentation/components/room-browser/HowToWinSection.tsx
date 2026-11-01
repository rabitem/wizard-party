'use client';

import { motion } from 'motion/react';
import { Sparkles, Wand2, Target, Star, Trophy } from 'lucide-react';

const HOW_TO_WIN_ITEMS = [
  { icon: Wand2, label: 'Predict', desc: 'Bid tricks' },
  { icon: Target, label: 'Strategize', desc: 'Play smart' },
  { icon: Star, label: 'Wizards', desc: 'Always win' },
  { icon: Trophy, label: 'Score', desc: 'Hit your bid' },
] as const;

export function HowToWinSection() {
  return (
    <motion.section
      className="mb-6 sm:mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div className="flex items-center gap-2 mb-3 px-1">
        <Sparkles className="w-3.5 h-3.5 text-amber-500/50" />
        <h2 className="text-amber-400/60 text-xs uppercase tracking-wider" style={{ fontFamily: 'Georgia, serif' }}>
          How to Win
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {HOW_TO_WIN_ITEMS.map((item, i) => (
          <motion.div
            key={item.label}
            className="flex items-center gap-2.5 p-3 rounded-xl border border-amber-800/20"
            style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, color-mix(in srgb, var(--surface), black 5%) 70%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 31%) 50%, transparent) 100%)',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.05 }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-dim) 25%, transparent) 0%, color-mix(in srgb, var(--color-amber-950) 15%, transparent) 100%)' }}
            >
              <item.icon className="w-4 h-4 text-amber-500/70" />
            </div>
            <div className="min-w-0">
              <div className="text-amber-200/80 text-xs sm:text-sm" style={{ fontFamily: 'Georgia, serif' }}>
                {item.label}
              </div>
              <div className="text-amber-600/40 text-[10px]" style={{ fontFamily: 'Georgia, serif' }}>
                {item.desc}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
