'use client';

import Link from 'next/link';
import { Crown } from 'lucide-react';

import type { LeaderboardCategory, LeaderboardEntry } from '@shared/domain/account/leaderboard';

import { PlayerAvatar } from '@/presentation/components/account/PlayerAvatar';
import { publicProfilePath } from '@/presentation/components/account/public/public-profile-links';

import { CATEGORY_COPY, MEDAL_STYLES } from './leaderboard-format';

const SERIF = { fontFamily: 'Georgia, serif' } as const;
/** Visual order: second, first, third, so the champion stands in the middle. */
const PODIUM_ORDER = [1, 0, 2];
/** Visual slot of the first entry (the middle column). */
const CHAMPION_PLACE = 1;
const STEP_HEIGHT = ['h-14 sm:h-16', 'h-20 sm:h-24', 'h-10 sm:h-12'];

function PodiumSpot({ entry, category, place, isSelf }: { entry: LeaderboardEntry; category: LeaderboardCategory; place: number; isSelf: boolean }) {
  const medal = MEDAL_STYLES[entry.rank] ?? MEDAL_STYLES[3];
  const copy = CATEGORY_COPY[category];
  return (
    <Link
      href={publicProfilePath(entry.username)}
      className="group flex flex-col items-center min-w-0 focus-visible:outline-none"
      aria-label={`${medal.label}: ${entry.displayName}, ${copy.value(entry)}`}
    >
      <div className="relative mb-2">
        {entry.rank === 1 ? <Crown className="absolute -top-5 left-1/2 -translate-x-1/2 w-5 h-5 text-amber-300 drop-shadow" strokeWidth={1.75} /> : null}
        <div className="rounded-full p-[3px] transition-transform group-hover:scale-105 group-focus-visible:scale-105" style={{ background: medal.ring, boxShadow: `0 0 22px ${medal.glow}` }}>
          <PlayerAvatar avatarId={entry.avatar} size={place === CHAMPION_PLACE ? 'lg' : 'md'} level={entry.level} />
        </div>
        <span
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 min-w-6 h-6 px-1 rounded-full border-2 text-[11px] font-bold inline-flex items-center justify-center tabular-nums"
          style={{ background: 'color-mix(in srgb, var(--surface), black 5%)', borderColor: medal.ring, color: medal.text, ...SERIF }}
        >
          {entry.rank}
        </span>
      </div>
      <span className={`mt-1 max-w-full truncate text-xs sm:text-sm ${isSelf ? 'text-amber-200' : 'text-amber-50'} group-hover:text-white`} style={SERIF}>
        {entry.displayName}
      </span>
      <span className="mt-1 text-base sm:text-lg tabular-nums leading-tight" style={{ ...SERIF, color: medal.text }}>{copy.value(entry)}</span>
      <span className="max-w-full truncate text-[10px] text-amber-600/60">{copy.detail(entry)}</span>
      <div
        className={`mt-2 w-full ${STEP_HEIGHT[place]} rounded-t-lg border-x border-t`}
        style={{ borderColor: `${medal.ring}55`, background: `linear-gradient(180deg, ${medal.glow} 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 23%) 20%, transparent) 100%)` }}
        aria-hidden
      />
    </Link>
  );
}

export function ChampionPodium({ entries, category, selfUsername }: { entries: LeaderboardEntry[]; category: LeaderboardCategory; selfUsername: string | null }) {
  const top = entries.slice(0, 3);
  return (
    <div className="grid grid-cols-3 items-end gap-2 sm:gap-4 px-1 pt-6">
      {PODIUM_ORDER.map((index, place) => {
        const entry = top[index];
        if (!entry) return <div key={`empty-${index}`} aria-hidden />;
        return <PodiumSpot key={entry.username} entry={entry} category={category} place={place} isSelf={entry.username === selfUsername} />;
      })}
    </div>
  );
}
