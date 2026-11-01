'use client';

import { Award } from 'lucide-react';

import type { AccountOverviewDto } from '@/lib/account/account-api';

import { INSET_BG, INSET_RAISED_BG } from '../account-surfaces';
import { AchievementIcon, TIER_STYLES } from '../AchievementIcon';
import { Panel, ProgressBar, SectionHeading } from '../ui';

export function AchievementsSection({ overview }: { overview: AccountOverviewDto }) {
  const unlocked = overview.achievements.filter((a) => a.unlockedAt !== null).length;
  // Unlocked first (newest first), then closest to completion.
  const sorted = [...overview.achievements].sort((a, b) => {
    if ((a.unlockedAt === null) !== (b.unlockedAt === null)) return a.unlockedAt === null ? 1 : -1;
    if (a.unlockedAt !== null && b.unlockedAt !== null) return b.unlockedAt - a.unlockedAt;
    return b.progress.current / b.progress.target - a.progress.current / a.progress.target;
  });

  return (
    <Panel accent={false}>
      <div className="p-4 sm:p-5">
        <SectionHeading
          icon={<Award className="w-4 h-4" />}
          title="Achievements"
          description={`${unlocked} of ${overview.achievements.length} unlocked`}
        />
        <ProgressBar value={unlocked} max={overview.achievements.length} className="mb-5" />
        <ul className="grid sm:grid-cols-2 gap-2.5 sm:gap-3">
          {sorted.map(({ definition, progress, unlockedAt }) => {
            const locked = unlockedAt === null;
            const hidden = locked && definition.secret;
            return (
              <li
                key={definition.id}
                className={`flex items-center gap-3 rounded-xl border p-3 ${locked ? 'border-amber-900/30 opacity-80' : 'border-amber-700/40'}`}
                style={{ background: locked ? INSET_BG : INSET_RAISED_BG }}
              >
                <AchievementIcon icon={definition.icon} tier={definition.tier} locked={locked} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-serif text-sm truncate ${locked ? 'text-amber-200/60' : 'text-amber-50'}`}>
                      {hidden ? 'Secret achievement' : definition.name}
                    </span>
                    <span className={`text-[9px] uppercase tracking-wider shrink-0 ${TIER_STYLES[definition.tier]?.text ?? ''} ${locked ? 'opacity-50' : ''}`}>
                      {TIER_STYLES[definition.tier]?.label}
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/45 truncate">{hidden ? 'Keep playing to discover it.' : definition.description}</p>
                  {locked && !hidden && progress.target > 1 ? (
                    <div className="mt-1.5 flex items-center gap-2">
                      <ProgressBar value={progress.current} max={progress.target} className="flex-1 h-1.5" />
                      <span className="text-[10px] text-amber-200/40 tabular-nums">{progress.current}/{progress.target}</span>
                    </div>
                  ) : null}
                  {!locked ? (
                    <p className="text-[10px] text-amber-500/60 mt-0.5">Unlocked {new Date(unlockedAt).toLocaleDateString()}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}
