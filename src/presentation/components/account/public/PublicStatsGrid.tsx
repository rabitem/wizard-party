'use client';

import type { ReactNode } from 'react';
import { BarChart3, Crown, Flame, Swords, Target, Trophy } from 'lucide-react';

import type { PublicHeadlineStats } from '@shared/domain/account/public-profile';

import { INSET_RAISED_BG } from '../account-surfaces';
import { Panel, SERIF, SectionHeading } from '../ui';
import { formatNumber, formatPercent } from './public-profile-format';

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-amber-800/30 px-3 py-3 sm:px-4 sm:py-4 min-w-0" style={{ background: INSET_RAISED_BG }}>
      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] uppercase tracking-wider text-amber-500/70" style={SERIF}>
        <span className="shrink-0" aria-hidden>
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5 text-xl sm:text-2xl text-amber-50 tabular-nums truncate" style={SERIF}>
        {value}
      </div>
    </div>
  );
}

export function PublicStatsGrid({ stats }: { stats: PublicHeadlineStats }) {
  const played = stats.gamesPlayed > 0;
  const none = '–';
  return (
    <Panel accent={false}>
      <div className="p-4 sm:p-5">
        <SectionHeading icon={<BarChart3 className="w-4 h-4" />} title="Battle record" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <Stat icon={<Swords className="w-3.5 h-3.5" />} label="Games" value={formatNumber(stats.gamesPlayed)} />
          <Stat icon={<Crown className="w-3.5 h-3.5" />} label="Victories" value={formatNumber(stats.gamesWon)} />
          <Stat icon={<Trophy className="w-3.5 h-3.5" />} label="Win rate" value={played ? formatPercent(stats.winRate) : none} />
          <Stat icon={<Target className="w-3.5 h-3.5" />} label="Bid accuracy" value={played ? formatPercent(stats.bidAccuracy) : none} />
          <Stat icon={<BarChart3 className="w-3.5 h-3.5" />} label="Best score" value={played ? formatNumber(stats.highestScore) : none} />
          <Stat icon={<Flame className="w-3.5 h-3.5" />} label="Best streak" value={formatNumber(stats.bestWinStreak)} />
        </div>
      </div>
    </Panel>
  );
}
