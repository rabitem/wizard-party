'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { LogIn } from 'lucide-react';

import { useAccount } from '@/presentation/providers/AccountProvider';
import { useTournamentAvailability } from '@/presentation/hooks/useTournamentAvailability';
import { TOURNAMENT_ROUTES } from '@/presentation/config/tournament.config';

import { TournamentMessage, TournamentSkeleton, TournamentsUnavailable } from './TournamentStates';
import { hostAccess } from './tournament-view-model';

const LINK_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 min-h-11 text-sm border-2 border-amber-600/60 text-amber-100 hover:border-amber-500/80 hover:text-white transition-all';

/**
 * Renders its children only for a signed-in player on a deployment that runs tournaments; guests
 * are asked to sign in.
 */
export function TournamentAccessGate({ next, children }: { next: string; children: ReactNode }) {
  const { status } = useAccount();
  const available = useTournamentAvailability();
  const access = hostAccess({ status });

  if (available === false) return <TournamentsUnavailable />;
  if (access === 'loading' || available === null) return <TournamentSkeleton rows={2} />;
  if (access === 'sign_in') {
    return (
      <TournamentMessage
        icon={<LogIn className="w-10 h-10" strokeWidth={1.25} />}
        title="Sign in to host tournaments"
        action={
          <Link href={TOURNAMENT_ROUTES.signIn(next)} className={`${LINK_CLASS} font-serif`}>
            Sign in
          </Link>
        }
      >
        Tournaments are played with accounts, so results, trophies and XP land in the right hands.
      </TournamentMessage>
    );
  }
  return children;
}
