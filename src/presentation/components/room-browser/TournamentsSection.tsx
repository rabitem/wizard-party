'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Trophy } from 'lucide-react';

import { TOURNAMENT_ROUTES } from '@/presentation/config/tournament.config';
import { useTournamentAvailability } from '@/presentation/hooks/useTournamentAvailability';


/**
 * Home page entry to /tournaments, styled like the other home sections. Hidden only when the
 * deployment reports tournaments as switched off (no TOURNAMENT_SECRET or database).
 */
export function TournamentsSection() {
  const available = useTournamentAvailability();
  if (available === false) return null;

  return (
    <motion.section
      className="mb-6 sm:mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Link
        href={TOURNAMENT_ROUTES.LIST}
        className="w-full group relative flex items-center justify-between gap-3 p-3 sm:p-4 rounded border border-amber-700/40 hover:border-amber-500/50 hover:bg-amber-900/10 transition-all cursor-pointer active:scale-[0.99]"
        style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--surface) 85%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 23%) 85%, transparent) 100%)' }}
      >
        {/* Corner accents */}
        <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l border-amber-500/40 pointer-events-none" />
        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t border-r border-amber-500/40 pointer-events-none" />
        <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b border-l border-amber-500/40 pointer-events-none" />
        <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r border-amber-500/40 pointer-events-none" />
        <div className="flex items-center gap-3 relative min-w-0">
          <div
            className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-lg flex items-center justify-center border border-amber-600/40"
            style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-amber-500) 30%, transparent) 0%, color-mix(in srgb, var(--color-amber-800) 20%, transparent) 100%)', boxShadow: '0 0 16px color-mix(in srgb, var(--color-amber-500) 15%, transparent)' }}
          >
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" aria-hidden />
          </div>
          <div className="text-left min-w-0">
            <div className="text-amber-100/90 text-sm sm:text-base font-serif">
              Tournaments
            </div>
            <div className="text-amber-500/60 text-xs font-serif">
              Series and knockouts at real tables. Win trophies and XP.
            </div>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 shrink-0 text-amber-600/50 group-hover:text-amber-400 group-hover:translate-x-1 transition-all relative" aria-hidden />
      </Link>
    </motion.section>
  );
}
