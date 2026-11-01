'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CalendarDays, Swords, Users, type LucideIcon } from 'lucide-react';

import type { CommunityStats } from '@shared/domain/account/community-stats';

const SERIF = { fontFamily: 'Georgia, serif' } as const;
const REFRESH_MS = 60_000;

/** Polls the cached aggregate counts while the page is visible. */
function useCommunityStats(): CommunityStats | null {
  const [stats, setStats] = useState<CommunityStats | null>(null);
  useEffect(() => {
    let active = true;
    const load = () => {
      if (document.visibilityState !== 'visible') return;
      fetch('/api/community-stats')
        .then((response) => (response.ok ? response.json() : null))
        .then((next: CommunityStats | null) => active && next && setStats(next))
        .catch(() => undefined);
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, []);
  return stats;
}

function Pulse({ value, label, icon: Icon, live }: { value: number; label: string; icon?: LucideIcon; live?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0 px-3 py-2.5 sm:px-4">
      {live ? (
        <span className="relative flex w-2.5 h-2.5 shrink-0" aria-hidden>
          <span className="absolute inset-0 rounded-full bg-emerald-400/70 animate-ping" />
          <span className="relative w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
        </span>
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0 text-amber-500/70" />
      ) : null}
      <span className="min-w-0">
        <span className="block text-base sm:text-lg leading-tight text-amber-100 tabular-nums" style={SERIF}>{value.toLocaleString('en-US')}</span>
        <span className="block truncate text-[10px] sm:text-[11px] uppercase tracking-wider text-amber-500/60" style={SERIF}>{label}</span>
      </span>
    </div>
  );
}

/** Live community numbers under the name card: social proof that the realm is alive. */
export function RealmPulse() {
  const stats = useCommunityStats();
  if (!stats) return <div className="h-[62px] mb-6 sm:mb-8" aria-hidden />;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      aria-label="Realm activity"
      className="mb-6 sm:mb-8 grid grid-cols-2 sm:grid-cols-4 divide-amber-800/20 rounded-2xl border border-amber-800/30 overflow-hidden [&>*]:border-amber-800/20 [&>*:nth-child(odd)]:border-r sm:[&>*]:border-r sm:[&>*:last-child]:border-r-0 [&>*:nth-child(-n+2)]:border-b sm:[&>*:nth-child(-n+2)]:border-b-0"
      style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--surface) 75%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 31%) 75%, transparent) 100%)' }}
    >
      <Pulse live value={stats.playingNow} label="Playing now" />
      <Pulse icon={Users} value={stats.playersToday} label="Players today" />
      <Pulse icon={Swords} value={stats.gamesToday} label="Games today" />
      <Pulse icon={CalendarDays} value={stats.registeredPlayers} label="Registered" />
    </motion.section>
  );
}
