'use client';

import { Trophy } from 'lucide-react';

import type { TournamentMatchRoomState } from '@shared/domain/tournament';

import { useTournamentClock } from '@/presentation/hooks/useTournamentClock';

import { deadlineCaption, isPastMatchDeadline, roundTableCaption } from './tournament-match-state';

/**
 * In-game reminder that this is a tournament match: a small plaque under the round/trump bar.
 * Phones show "Round 2 · Table 3"; wider screens the full label ("Spring Cup · Round 2 · Table 3").
 * Below it the deadline ("Counts if finished by 18:30"), which turns into a warning once it
 * passed mid-game (the tournament has voided the table, the result no longer counts).
 */
export function TournamentMatchBadge({ match }: { match: Pick<TournamentMatchRoomState, 'label' | 'round' | 'table' | 'deadlineAt'> }) {
  // Times are already on this device's clock (see readTournamentMatch).
  const now = useTournamentClock(0, match.deadlineAt !== null);
  const deadline = deadlineCaption(match, { now });
  const pastDeadline = isPastMatchDeadline(match, now);
  return (
    <div
      className="mt-1.5 inline-flex max-w-[60vw] sm:max-w-xs flex-col items-start px-2 py-1 border border-amber-700/40 text-[10px] sm:text-xs text-amber-200/85"
      style={{ background: 'var(--surface)', fontFamily: 'Georgia, serif', backdropFilter: 'blur(8px)' }}
      title={deadline ? `${match.label} · ${deadline}` : match.label}
    >
      <span className="inline-flex max-w-full items-center gap-1.5">
        <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-amber-400" aria-hidden />
        <span className="sr-only">Tournament match: </span>
        <span className="truncate sm:hidden">{roundTableCaption(match)}</span>
        <span className="truncate hidden sm:inline">{match.label}</span>
      </span>
      {deadline ? (
        <span className={`max-w-full truncate text-[9px] sm:text-[11px] ${pastDeadline ? 'text-rose-300/85' : 'text-amber-200/55'}`}>
          <span className="sr-only">. </span>
          {deadline}
        </span>
      ) : null}
    </div>
  );
}
