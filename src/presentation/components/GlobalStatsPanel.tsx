'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import type { GlobalStats } from '@shared/domain/stats';
import type { GlobalStatsResponse } from '@/app/api/types/global-stats.types';
import { CONSTANTS } from '@/presentation/config/constants';

const SERIF = { fontFamily: 'Georgia, serif' } as const;

/** One line of the realm's ledger: what was counted and how many. */
function LedgerRow({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="flex items-baseline gap-3 py-2.5 border-b border-amber-800/25">
      <dt className="min-w-0 flex-1" style={SERIF}>
        <span className="block text-sm text-amber-100/90">{label}</span>
        <span className="block text-xs text-amber-200/65">{description}</span>
      </dt>
      <dd className="text-xl text-amber-200 tabular-nums" style={SERIF}>{value}</dd>
    </div>
  );
}

/** Build the ledger rows from stats data */
function buildStatItems(stats: GlobalStats, bidAccuracy: number) {
  return [
    { label: 'Battles fought', value: stats.gamesPlayed.toLocaleString(), description: 'games completed' },
    { label: 'Rounds conquered', value: stats.roundsPlayed.toLocaleString(), description: 'rounds played' },
    { label: 'Tricks claimed', value: stats.tricksPlayed.toLocaleString(), description: 'tricks won' },
    { label: 'Wizards summoned', value: stats.wizardsPlayed.toLocaleString(), description: 'wizard cards played' },
    { label: 'Jesters unleashed', value: stats.jestersPlayed.toLocaleString(), description: 'jester cards played' },
    { label: 'Prophecy accuracy', value: `${bidAccuracy}%`, description: `${stats.perfectBids.toLocaleString()} perfect bids` },
    { label: 'Greatest glory', value: stats.highestScore.toLocaleString(), description: 'highest score ever' },
    { label: 'Comeback victories', value: stats.comebackWins.toLocaleString(), description: 'epic turnarounds' },
  ];
}

/** The realm's statistics as a ledger of label-and-value rows. */
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
    <motion.section aria-labelledby="chronicles-heading" className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.32 }}>
      <h2 id="chronicles-heading" className="text-2xl sm:text-3xl text-amber-50" style={SERIF}>Chronicles of the realm</h2>
      <p className="mt-2 text-sm text-amber-100/80" style={SERIF}>
        <span className="text-amber-200 tabular-nums">{stats.cardsPlayed.toLocaleString()}</span> cards have been played at these tables.
      </p>
      <dl className="mt-4 grid sm:grid-cols-2 gap-x-8">
        {statItems.map((item) => <LedgerRow key={item.label} {...item} />)}
      </dl>
      {stats.isMock ? <p className="mt-3 text-xs text-amber-200/70 italic" style={SERIF}>Sample figures: live statistics are not configured on this server.</p> : null}
    </motion.section>
  );
}
