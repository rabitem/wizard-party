'use client';

import { useMemo } from 'react';
import Link from 'next/link';

import { TOURNAMENT_ROUTES } from '@/presentation/config/tournament.config';
import { useTournamentAvailability } from '@/presentation/hooks/useTournamentAvailability';
import { useTournamentsOfViewer } from '@/presentation/hooks/useTournamentsOfViewer';

import { TrophyCabinet } from './TrophyCabinet';
import { countTrophyTiers, fromTrophyViews } from './trophy-cabinet';

/**
 * The signed-in player's trophy cabinet on /account. Stays out of the way while loading, when the
 * call fails, and on deployments without tournaments (unless trophies were already won).
 */
export function OwnTrophyCabinet({ userId }: { userId: string }) {
  const available = useTournamentAvailability();
  const view = useTournamentsOfViewer(userId);
  const entries = useMemo(() => (view ? fromTrophyViews(view.trophies) : []), [view]);

  if (!view || (available === false && entries.length === 0)) return null;
  return (
    <TrophyCabinet
      entries={entries}
      counts={countTrophyTiers(entries)}
      description="Awards from the tournaments you played. They also show on your public profile."
      empty={
        <>
          No trophies yet.{' '}
          <Link href={TOURNAMENT_ROUTES.LIST} className="text-amber-400/80 hover:text-amber-300 underline-offset-2 hover:underline">
            Enter a tournament
          </Link>{' '}
          to start your collection.
        </>
      }
    />
  );
}
