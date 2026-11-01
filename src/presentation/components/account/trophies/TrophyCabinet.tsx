'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Trophy } from 'lucide-react';

import { TROPHY_TIER_STYLES, TournamentTrophyIcon } from '@/presentation/components/tournament/TournamentTrophyIcon';

import { INSET_RAISED_BG } from '../account-surfaces';
import { Panel, SERIF, SectionHeading } from '../ui';
import { CABINET_COUNTED_TIERS, trophyCaption, trophyTournamentLabel, type TrophyCabinetEntry, type TrophyTierCounts } from './trophy-cabinet';

function TierCounters({ counts }: { counts: TrophyTierCounts }) {
  const shown = CABINET_COUNTED_TIERS.filter((tier) => counts[tier] > 0);
  if (shown.length === 0) return null;
  return (
    <ul className="flex flex-wrap justify-end gap-1.5" aria-label="Trophies by tier">
      {shown.map((tier) => (
        <li
          key={tier}
          className={`inline-flex items-center gap-1 rounded-full border px-2 h-6 text-[11px] tabular-nums ${TROPHY_TIER_STYLES[tier].ring} ${TROPHY_TIER_STYLES[tier].text}`}
          title={`${counts[tier]} ${TROPHY_TIER_STYLES[tier].label}`}
        >
          <Trophy className="w-3 h-3" aria-hidden />
          {counts[tier]}
          <span className="sr-only">{TROPHY_TIER_STYLES[tier].label}</span>
        </li>
      ))}
    </ul>
  );
}

function TrophyTile({ entry }: { entry: TrophyCabinetEntry }) {
  const tournament = trophyTournamentLabel(entry);
  return (
    <li className="flex items-center gap-3 rounded-xl border border-amber-800/30 p-2.5 min-w-0" style={{ background: INSET_RAISED_BG }}>
      <TournamentTrophyIcon icon={entry.icon} tier={entry.tier} title={entry.name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-sm text-amber-50 truncate" style={SERIF} title={entry.description}>
            {entry.name}
          </span>
          {entry.xp !== null && entry.xp > 0 ? <span className="shrink-0 text-[10px] text-amber-400/70 tabular-nums">+{entry.xp} XP</span> : null}
        </div>
        {entry.href ? (
          <Link href={entry.href} className="block text-xs text-amber-300/75 hover:text-amber-200 truncate underline-offset-2 hover:underline">
            {tournament}
          </Link>
        ) : (
          <span className="block text-xs text-amber-300/50 italic truncate">{tournament}</span>
        )}
        <span className="block text-[11px] text-amber-200/40 truncate">{trophyCaption(entry)}</span>
      </div>
    </li>
  );
}

interface TrophyCabinetProps {
  entries: readonly TrophyCabinetEntry[];
  counts: TrophyTierCounts;
  /** Shown instead of the grid when there are no trophies (omit to say nothing). */
  empty?: ReactNode;
  description?: string;
}

/** Tournament awards as a trophy shelf: tier counters in the heading, newest trophies first. */
export function TrophyCabinet({ entries, counts, empty, description }: TrophyCabinetProps) {
  return (
    <Panel accent={false}>
      <div className="p-4 sm:p-5">
        <SectionHeading icon={<Trophy className="w-4 h-4" />} title="Trophy cabinet" description={description} action={<TierCounters counts={counts} />} />
        {entries.length === 0 ? (
          <div className="text-sm text-amber-200/45" style={SERIF}>
            {empty}
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {entries.map((entry) => (
              <TrophyTile key={entry.key} entry={entry} />
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
