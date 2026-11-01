'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Scroll, Gamepad2, Sparkles, Ghost, Layers, Target, Trophy, Flame, Swords, type LucideIcon } from 'lucide-react';
import type { GlobalStats } from '@shared/domain/stats';
import type { GlobalStatsResponse } from '@/app/api/types/global-stats.types';
import { CONSTANTS } from '@/presentation/config/constants';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';
import { SeasonalEmblem } from '@/presentation/components/seasonal';

/** Section header with decorative dividers */
function SectionHeader() {
  return (
    <div className="flex items-center justify-center gap-4 mb-6">
      <div className="h-px flex-1 max-w-24 bg-gradient-to-r from-transparent to-amber-700/30" />
      <div className="flex items-center gap-2">
        <Scroll className="w-5 h-5 text-amber-500/70" />
        <h2 className="text-amber-300/80 text-lg tracking-wider uppercase" style={{ fontFamily: 'Georgia, serif' }}>Chronicles of the Realm</h2>
      </div>
      <div className="h-px flex-1 max-w-24 bg-gradient-to-l from-transparent to-amber-700/30" />
    </div>
  );
}

/** Individual stat card */
function StatCard({ icon: Icon, label, value, description, index }: { icon: LucideIcon; label: string; value: string; description: string; index: number }) {
  return (
    <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + index * 0.05 }} className="group relative rounded-lg border border-amber-800/30 p-3 sm:p-4 hover:border-amber-700/50 transition-colors" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--surface) 60%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 10%) 60%, transparent) 100%)' }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-amber-500/70 group-hover:text-amber-400/80 transition-colors" />
        <span className="text-[10px] sm:text-xs text-amber-500/60 uppercase tracking-wider truncate" style={{ fontFamily: 'Georgia, serif' }}>{label}</span>
      </div>
      <div className="text-xl sm:text-2xl font-semibold text-amber-200/90 mb-1" style={{ fontFamily: 'Georgia, serif' }}>{value}</div>
      <div className="text-[10px] sm:text-xs text-amber-600/50" style={{ fontFamily: 'Georgia, serif' }}>{description}</div>
    </motion.div>
  );
}

/** Total cards played banner */
function TotalCardsBanner({ cardsPlayed }: { cardsPlayed: number }) {
  return (
    <div className="mt-4 flex items-center justify-center gap-3 py-3 px-4 rounded-lg border border-amber-800/20" style={{ background: THEME_SURFACE.CARD_BG_SOFT }}>
      <span className="text-amber-700/50">✦</span>
      <span className="text-sm text-amber-400/70" style={{ fontFamily: 'Georgia, serif' }}><span className="text-amber-300/90 font-semibold">{cardsPlayed.toLocaleString()}</span> cards have graced the tables of this realm</span>
      <span className="text-amber-700/50">✦</span>
    </div>
  );
}

/** Build stat items array from stats data */
function buildStatItems(stats: GlobalStats, bidAccuracy: number) {
  return [
    { icon: Gamepad2, label: 'Battles Fought', value: stats.gamesPlayed.toLocaleString(), description: 'games completed' },
    { icon: Layers, label: 'Rounds Conquered', value: stats.roundsPlayed.toLocaleString(), description: 'rounds played' },
    { icon: Swords, label: 'Tricks Claimed', value: stats.tricksPlayed.toLocaleString(), description: 'tricks won' },
    { icon: Sparkles, label: 'Wizards Summoned', value: stats.wizardsPlayed.toLocaleString(), description: 'wizard cards played' },
    { icon: Ghost, label: 'Jesters Unleashed', value: stats.jestersPlayed.toLocaleString(), description: 'jester cards played' },
    { icon: Target, label: 'Prophecy Accuracy', value: `${bidAccuracy}%`, description: `${stats.perfectBids.toLocaleString()} perfect bids` },
    { icon: Trophy, label: 'Greatest Glory', value: stats.highestScore.toLocaleString(), description: 'highest score ever' },
    { icon: Flame, label: 'Comeback Victories', value: stats.comebackWins.toLocaleString(), description: 'epic turnarounds' },
  ];
}

export function GlobalStatsPanel() {
  const [stats, setStats] = useState<GlobalStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch(CONSTANTS.API.STATS);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch global stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  // Calculate bid accuracy percentage (safe even when stats is null)
  const bidAccuracy = stats && stats.totalBids > 0
    ? Math.round((stats.perfectBids / stats.totalBids) * 100)
    : 0;

  // Build stat items (useMemo must be called unconditionally)
  const statItems = useMemo(
    () => (stats ? buildStatItems(stats, bidAccuracy) : []),
    [stats, bidAccuracy]
  );

  if (isLoading || !stats) {
    return null;
  }

  return (
    <motion.section className="mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.32 }}>
      <SectionHeader />
      <div className="rounded-xl border border-amber-700/40 overflow-hidden" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, color-mix(in srgb, var(--surface), black 5%) 95%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 31%) 95%, transparent) 100%)', boxShadow: '0 4px 30px rgba(0,0,0,0.3), inset 0 1px 0 color-mix(in srgb, var(--accent-deep) 8%, transparent)' }}>
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--accent-deep) 30%, transparent) 50%, transparent 100%)' }} />
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {statItems.map((item, index) => <StatCard key={item.label} {...item} index={index} />)}
          </div>
          <TotalCardsBanner cardsPlayed={stats.cardsPlayed} />
        </div>
        <div className="flex justify-center pb-4"><SeasonalEmblem size={14} className="opacity-70" /></div>
        {stats.isMock ? <div className="text-center pb-3 text-[10px] text-amber-800/40 italic">Sample data - Redis not configured</div> : null}
      </div>
    </motion.section>
  );
}
