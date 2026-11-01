'use client';

import Link from 'next/link';
import { ChevronRight, Crown, Lock, Users } from 'lucide-react';

import type { TournamentSummaryView } from '@shared/application/use-cases/tournament';

import { TOURNAMENT_ROUTES } from '@/presentation/config/tournament.config';
import { useTournamentClock } from '@/presentation/hooks/useTournamentClock';

import { INSET_BG } from '../account/account-surfaces';
import { SERIF } from '../account/ui';
import { TournamentStatusBadge } from './TournamentStatusBadge';
import { fieldFill, fieldLabel, scheduleLine } from './tournament-view-model';

/**
 * One tournament in a list: status, format, host, schedule and how full the field is. Only cards
 * with a scheduled start keep a clock (for the countdown), so the list itself never re-renders.
 */
export function TournamentCard({ tournament, footnote }: { tournament: TournamentSummaryView; footnote?: string | null }) {
  const now = useTournamentClock(0, tournament.status === 'registration' && tournament.startsAt !== null);
  const fill = fieldFill(tournament);
  return (
    <Link
      href={TOURNAMENT_ROUTES.detail(tournament.id)}
      className="group block rounded-2xl border border-amber-800/30 px-4 py-3.5 transition-colors hover:border-amber-600/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
      style={{ background: INSET_BG }}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <TournamentStatusBadge status={tournament.status} />
            <span className="text-[11px] uppercase tracking-wider text-amber-500/60" style={SERIF}>
              {tournament.formatName}
            </span>
            {tournament.visibility === 'private' ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-400/60">
                <Lock className="w-3 h-3" aria-hidden /> Private
              </span>
            ) : null}
          </div>
          <h3 className="mt-1.5 truncate text-base sm:text-lg text-amber-50 group-hover:text-white" style={SERIF}>
            {tournament.name}
          </h3>
          <p className="mt-0.5 text-xs text-amber-200/50">
            Hosted by {tournament.host.displayName} · {scheduleLine(tournament, now)}
          </p>
          {tournament.champion ? (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-amber-300" style={SERIF}>
              <Crown className="w-3.5 h-3.5" aria-hidden /> Champion: {tournament.champion.displayName}
            </p>
          ) : null}
          {footnote ? <p className="mt-1 text-xs text-amber-400/80" style={SERIF}>{footnote}</p> : null}
        </div>
        <ChevronRight className="mt-6 w-5 h-5 shrink-0 text-amber-600/40 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-400/70" aria-hidden />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-amber-200/60 tabular-nums">
          <Users className="w-3.5 h-3.5" aria-hidden />
          {fieldLabel(tournament)}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full border border-amber-900/40 bg-black/40" aria-hidden>
          <div className="h-full rounded-full bg-gradient-to-r from-amber-700 to-amber-400" style={{ width: `${Math.round(fill * 100)}%` }} />
        </div>
      </div>
    </Link>
  );
}
