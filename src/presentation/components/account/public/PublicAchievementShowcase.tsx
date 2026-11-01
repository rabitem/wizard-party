'use client';

import { Award } from 'lucide-react';

import { ACHIEVEMENTS } from '@shared/domain/account';
import type { PublicProfile } from '@shared/domain/account/public-profile';

import { INSET_BG } from '../account-surfaces';
import { AchievementIcon } from '../AchievementIcon';
import { Panel, SectionHeading } from '../ui';
import { formatDate } from './public-profile-format';

const DEFINITIONS = new Map(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]));

export function PublicAchievementShowcase({ achievements }: { achievements: PublicProfile['achievements'] }) {
  const unlocked = achievements.flatMap(({ id, unlockedAt }) => {
    const definition = DEFINITIONS.get(id);
    return definition ? [{ definition, unlockedAt }] : [];
  });

  return (
    <Panel accent={false}>
      <div className="p-4 sm:p-5">
        <SectionHeading
          icon={<Award className="w-4 h-4" />}
          title="Achievements"
          action={
            <span className="text-xs text-amber-400/60 tabular-nums font-serif">
              {unlocked.length} / {ACHIEVEMENTS.length}
            </span>
          }
        />
        {unlocked.length === 0 ? (
          <p className="text-sm text-amber-200/45 font-serif">
            No achievements unlocked yet. The journey has only begun.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {unlocked.map(({ definition, unlockedAt }) => (
              <li
                key={definition.id}
                className="flex items-center gap-3 rounded-xl border border-amber-800/25 p-2.5 min-w-0"
                style={{ background: INSET_BG }}
              >
                <AchievementIcon icon={definition.icon} tier={definition.tier} size="sm" />
                <div className="min-w-0">
                  <div className="text-sm text-amber-100 truncate font-serif">
                    {definition.name}
                  </div>
                  <div className="text-[11px] text-amber-300/45 line-clamp-2">
                    {definition.description} · {formatDate(unlockedAt)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
