'use client';

import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

import { equippedCosmetics, nextReward, totalXpForLevel } from '@shared/domain/account';

import type { AccountOverviewDto } from '@/lib/account/account-api';

import { HeaderCorners } from '../AccountOrnaments';
import { SEAL_BG, TITLE_GLOW } from '../account-surfaces';
import { BANNER_STYLES } from '../cosmetic-styles';
import { PlayerAvatar } from '../PlayerAvatar';
import { Panel, ProgressBar } from '../ui';

function NextRewardHint({ level, totalXp }: { level: number; totalXp: number }) {
  const reward = nextReward(level);
  if (!reward) {
    return <p className="mt-2 text-xs text-amber-300/70 italic font-serif">Every reward on the Road of Mastery is yours.</p>;
  }
  const xpNeeded = Math.max(0, totalXpForLevel(reward.level) - totalXp);
  return (
    <p className="mt-2 flex items-start sm:items-center justify-center sm:justify-start gap-1.5 text-xs text-amber-200/60 font-serif">
      <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 sm:mt-0 text-amber-400/80" aria-hidden />
      <span>
        Next reward: <span className="text-amber-200">{reward.name}</span> at level {reward.level}
        <span className="text-amber-200/40 tabular-nums"> · {xpNeeded.toLocaleString()} XP to go</span>
      </span>
    </p>
  );
}

/** Header card of the account page: avatar with level frame, title, XP bar and next reward. */
export function LevelCard({ name, overview, footer }: { name: string; overview: AccountOverviewDto; /** Extra line under the XP bar, e.g. the public profile link. */ footer?: ReactNode }) {
  const { profile, progression } = overview;
  const { bannerId } = equippedCosmetics(progression.level);
  return (
    <Panel>
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: BANNER_STYLES[bannerId] }} />
      <HeaderCorners />
      <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
        <div className="relative">
          <PlayerAvatar size="xl" level={progression.level} glow />
          <span
            className="absolute -bottom-1 -right-1 min-w-8 h-8 px-1.5 rounded-full border-2 border-amber-500/70 text-amber-300 text-sm inline-flex items-center justify-center tabular-nums"
            style={{ fontFamily: 'var(--font-serif)', background: SEAL_BG }}
            aria-label={`Level ${progression.level}`}
          >
            {progression.level}
          </span>
        </div>
        <div className="flex-1 min-w-0 w-full">
          <div className="text-[11px] uppercase tracking-[0.25em] text-amber-500/80 font-serif">{progression.title}</div>
          <h1 className="text-2xl sm:text-3xl text-amber-50 truncate" style={{ fontFamily: 'var(--font-serif)', textShadow: TITLE_GLOW }}>{name}</h1>
          {profile.tagline ? <p className="text-sm text-amber-200/55 italic mt-0.5 truncate font-serif">“{profile.tagline}”</p> : null}
          <div className="mt-3">
            <ProgressBar value={progression.levelXp} max={progression.levelSpan} />
            <div className="mt-1.5 flex justify-between gap-3 text-[11px] text-amber-200/45 tabular-nums">
              <span>{progression.levelXp} / {progression.levelSpan} XP</span>
              <span>{progression.totalXp.toLocaleString()} XP total</span>
            </div>
          </div>
          <NextRewardHint level={progression.level} totalXp={progression.totalXp} />
          {footer ? <div className="mt-1 flex justify-center sm:justify-start">{footer}</div> : null}
        </div>
      </div>
    </Panel>
  );
}
