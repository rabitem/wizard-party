'use client';

import Link from 'next/link';

import type { LeaderboardCategory, LeaderboardEntry } from '@shared/domain/account/leaderboard';

import { PlayerAvatar } from '@/presentation/components/account/PlayerAvatar';
import { publicProfilePath } from '@/presentation/components/account/public/public-profile-links';

import { CATEGORY_COPY } from './leaderboard-format';

const SERIF = { fontFamily: 'Georgia, serif' } as const;

/** Ranks 4 and below as compact rows; the podium shows the top three. */
export function ChampionList({ entries, category, selfUsername }: { entries: LeaderboardEntry[]; category: LeaderboardCategory; selfUsername: string | null }) {
  if (entries.length === 0) return null;
  const copy = CATEGORY_COPY[category];
  return (
    <ol className="mt-4 divide-y divide-amber-800/15 rounded-xl border border-amber-800/25 overflow-hidden" style={{ background: 'color-mix(in srgb, color-mix(in srgb, var(--surface), black 42%) 45%, transparent)' }}>
      {entries.map((entry) => {
        const isSelf = entry.username === selfUsername;
        return (
          <li key={entry.username}>
            <Link
              href={publicProfilePath(entry.username)}
              className={`flex items-center gap-3 px-3 sm:px-4 min-h-14 py-2 transition-colors hover:bg-amber-900/20 focus-visible:bg-amber-900/25 focus-visible:outline-none ${isSelf ? 'bg-amber-900/25' : ''}`}
            >
              <span className="w-6 shrink-0 text-center text-sm text-amber-500/70 tabular-nums" style={SERIF}>{entry.rank}</span>
              <PlayerAvatar avatarId={entry.avatar} size="sm" level={entry.level} />
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm text-amber-50" style={SERIF}>{entry.displayName}</span>
                  {isSelf ? <span className="shrink-0 rounded-full bg-amber-600/80 px-1.5 text-[11px] text-amber-950">You</span> : null}
                </span>
                <span className="block truncate text-[11px] text-amber-500/55">{entry.title}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm sm:text-base text-amber-100 tabular-nums" style={SERIF}>{copy.value(entry)}</span>
                <span className="block text-[10px] text-amber-600/55">{copy.detail(entry)}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
