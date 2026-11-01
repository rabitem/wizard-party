'use client';

import Link from 'next/link';
import { Crown } from 'lucide-react';

import type { ChampionView } from '@shared/application/use-cases/tournament';

import { TOURNAMENT_ROUTES, TOURNAMENT_UI } from '@/presentation/config/tournament.config';

import { INSET_RAISED_BG } from '../account/account-surfaces';
import { PlayerMonogram } from './TournamentPlayer';

/** Horizontal strip of the latest champions; swipeable on phones. */
export function RecentChampionsStrip({ champions }: { champions: readonly ChampionView[] }) {
  if (champions.length === 0) return null;
  return (
    <section aria-labelledby="recent-champions">
      <h2 id="recent-champions" className="mb-2.5 flex items-center gap-2 text-xs uppercase tracking-widest text-amber-400/70 font-serif">
        <Crown className="w-4 h-4 text-amber-500/70" aria-hidden />
        Recent champions
      </h2>
      <ul className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none]">
        {champions.slice(0, TOURNAMENT_UI.CHAMPIONS_STRIP_SIZE).map((row) => (
          <li key={row.tournamentId} className="shrink-0">
            <Link
              href={TOURNAMENT_ROUTES.detail(row.tournamentId)}
              className="flex w-48 items-center gap-2.5 rounded-xl border border-amber-700/30 px-3 py-2.5 transition-colors hover:border-amber-500/60"
              style={{ background: INSET_RAISED_BG }}
            >
              <PlayerMonogram name={row.champion.displayName} highlight />
              <span className="min-w-0">
                <span className="block truncate text-sm text-amber-100 font-serif">
                  {row.champion.displayName}
                </span>
                <span className="block truncate text-[11px] text-amber-200/45">
                  {row.tournamentName} · {row.entrants} players
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
