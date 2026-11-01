'use client';

import { Check, Crown, Flag, Lock, Map as MapIcon, ScrollText } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';

import {
  LEVEL_REWARDS,
  isAvatarFrameId,
  isProfileBannerId,
  rewardMilestones,
  totalXpForLevel,
  type LevelReward,
  type RewardMilestone,
} from '@shared/domain/account';

import type { AccountOverviewDto } from '@/lib/account/account-api';

import { BANNER_STYLES } from '../cosmetic-styles';
import { PlayerAvatar } from '../PlayerAvatar';
import { Panel, ProgressBar, SERIF, SectionHeading } from '../ui';

type MilestoneState = 'unlocked' | 'next' | 'locked';

function RewardPreview({ reward }: { reward: LevelReward }) {
  const [, cosmeticId] = reward.id.split(':');
  if (reward.kind === 'frame' && isAvatarFrameId(cosmeticId)) return <PlayerAvatar size="sm" frameId={cosmeticId} />;
  if (reward.kind === 'banner' && isProfileBannerId(cosmeticId)) {
    return <span aria-hidden className="w-8 h-8 shrink-0 rounded-lg border border-amber-800/40" style={{ background: `${BANNER_STYLES[cosmeticId]}, var(--page-base)` }} />;
  }
  return (
    <span aria-hidden className="w-8 h-8 shrink-0 rounded-lg border border-amber-700/40 bg-amber-900/20 inline-flex items-center justify-center text-amber-300">
      <ScrollText className="w-4 h-4" />
    </span>
  );
}

const KIND_LABEL: Record<LevelReward['kind'], string> = { title: 'Title', frame: 'Avatar frame', banner: 'Profile banner' };

const STATE_STYLES: Record<MilestoneState, { node: string; card: string }> = {
  unlocked: { node: 'border-amber-500/70 bg-amber-700/40 text-amber-100', card: 'border-amber-700/40' },
  next: { node: 'border-amber-300 bg-amber-500/30 text-amber-50 ring-4 ring-amber-500/15', card: 'border-amber-400/60 bg-amber-900/20' },
  locked: { node: 'border-amber-900/60 bg-black/40 text-amber-200/35', card: 'border-amber-900/30 opacity-70' },
};

function StateBadge({ state, xpNeeded }: { state: MilestoneState; xpNeeded: number }) {
  if (state === 'unlocked') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300/80">
        <Check className="w-3.5 h-3.5" aria-hidden /> Unlocked
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] tabular-nums ${state === 'next' ? 'text-amber-200' : 'text-amber-200/45'}`}>
      {state === 'locked' ? <Lock className="w-3 h-3" aria-hidden /> : null}
      {xpNeeded.toLocaleString()} XP to go
    </span>
  );
}

function Milestone({ milestone, state, xpNeeded, isLast }: { milestone: RewardMilestone; state: MilestoneState; xpNeeded: number; isLast: boolean }) {
  const styles = STATE_STYLES[state];
  return (
    <li className="relative flex gap-3 sm:gap-4" aria-current={state === 'next' ? 'step' : undefined}>
      <div className="relative flex flex-col items-center">
        <span className={`relative z-10 w-11 h-11 shrink-0 rounded-full border-2 inline-flex items-center justify-center text-sm tabular-nums ${styles.node}`} style={SERIF}>
          {milestone.level}
        </span>
        {!isLast ? <span aria-hidden className={`flex-1 w-0.5 my-1 ${state === 'unlocked' ? 'bg-amber-600/60' : 'bg-amber-900/40'}`} /> : null}
      </div>
      <div className={`flex-1 min-w-0 mb-3 rounded-xl border p-3 ${styles.card}`}>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2">
          <span className="text-[11px] uppercase tracking-wider text-amber-500/80" style={SERIF}>Level {milestone.level}</span>
          <StateBadge state={state} xpNeeded={xpNeeded} />
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {milestone.rewards.map((reward) => (
            <li key={reward.id} className="flex items-center gap-2.5 min-w-0">
              <RewardPreview reward={reward} />
              <span className="min-w-0">
                <span className="block text-sm text-amber-50 truncate" style={SERIF}>{reward.name}</span>
                <span className="block text-[11px] text-amber-200/40">{KIND_LABEL[reward.kind]}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

function CurrentPosition({ level, complete = false }: { level: number; complete?: boolean }) {
  return (
    <li className="relative flex items-center gap-3 sm:gap-4 mb-3">
      <span className="w-11 shrink-0 inline-flex justify-center">
        <PlayerAvatar size="md" level={level} />
      </span>
      <span className="flex-1 min-w-0 rounded-full border border-dashed border-amber-500/50 bg-amber-900/25 px-3 py-2 text-xs sm:text-sm text-amber-100" style={SERIF}>
        {complete ? `You walked the whole road · Level ${level}` : `You are here · Level ${level}`}
      </span>
    </li>
  );
}

function SummaryTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-amber-800/30 bg-black/20 p-3">
      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] uppercase tracking-wider text-amber-500/70" style={SERIF}>
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-lg sm:text-xl text-amber-50 tabular-nums" style={SERIF}>{value}</div>
    </div>
  );
}

/** "Road of Mastery": every level milestone with its rewards, current position and XP still needed. */
export function RewardsSection({ overview }: { overview: AccountOverviewDto }) {
  const { progression } = overview;
  const milestones = rewardMilestones();
  const nextIndex = milestones.findIndex((milestone) => milestone.level > progression.level);
  const unlockedCount = LEVEL_REWARDS.filter((reward) => reward.level <= progression.level).length;
  const finalLevel = milestones[milestones.length - 1]?.level ?? progression.level;
  const stateOf = (index: number): MilestoneState => {
    if (milestones[index].level <= progression.level) return 'unlocked';
    return index === nextIndex ? 'next' : 'locked';
  };

  return (
    <Panel accent={false}>
      <div className="p-4 sm:p-5">
        <SectionHeading
          icon={<MapIcon className="w-4 h-4" />}
          title="Road of Mastery"
          description="Every level brings you closer to new titles, avatar frames and profile banners. Rewards are equipped automatically."
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
          <SummaryTile icon={<Flag className="w-3.5 h-3.5" />} label="Level" value={`${progression.level}`} />
          <SummaryTile icon={<Crown className="w-3.5 h-3.5" />} label="Rewards" value={`${unlockedCount} / ${LEVEL_REWARDS.length}`} />
          <div className="col-span-2 sm:col-span-1">
            <SummaryTile icon={<ScrollText className="w-3.5 h-3.5" />} label="Title" value={progression.title} />
          </div>
        </div>

        <div className="mb-5">
          <ProgressBar value={Math.min(progression.totalXp, totalXpForLevel(finalLevel))} max={totalXpForLevel(finalLevel)} />
          <div className="mt-1.5 flex justify-between gap-3 text-[11px] text-amber-200/45 tabular-nums">
            <span>{progression.totalXp.toLocaleString()} XP</span>
            <span>Level {finalLevel} at {totalXpForLevel(finalLevel).toLocaleString()} XP</span>
          </div>
        </div>

        <ol aria-label="Level rewards">
          {milestones.map((milestone, index) => (
            <Fragment key={milestone.level}>
              {index === nextIndex ? <CurrentPosition level={progression.level} /> : null}
              <Milestone
                milestone={milestone}
                state={stateOf(index)}
                xpNeeded={Math.max(0, totalXpForLevel(milestone.level) - progression.totalXp)}
                isLast={index === milestones.length - 1}
              />
            </Fragment>
          ))}
          {nextIndex === -1 ? <CurrentPosition level={progression.level} complete /> : null}
        </ol>
      </div>
    </Panel>
  );
}
