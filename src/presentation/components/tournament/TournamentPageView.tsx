'use client';

import { useEffect, useRef, type ComponentType } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Ban, RefreshCw, SearchX } from 'lucide-react';

import type { TournamentDetailView } from '@shared/application/use-cases/tournament';
import type { TournamentFormatId } from '@shared/domain/tournament';

import { useAccount } from '@/presentation/providers/AccountProvider';
import { isSettledStatus, useTournament } from '@/presentation/hooks/useTournament';
import { useTournamentActions, type TournamentActionKey, type TournamentActions } from '@/presentation/hooks/useTournamentActions';
import { useTournamentAvailability } from '@/presentation/hooks/useTournamentAvailability';
import { useTournamentClock } from '@/presentation/hooks/useTournamentClock';
import { TOURNAMENT_QUERY, TOURNAMENT_ROUTES } from '@/presentation/config/tournament.config';

import { AccountShell } from '../account/AccountShell';
import { Button, Notice, SERIF } from '../account/ui';
import { EntrantsList } from './EntrantsList';
import { FinalPodium } from './FinalPodium';
import { HostControls } from './HostControls';
import { KnockoutBracketView } from './KnockoutBracketView';
import { RegistrationPanel } from './RegistrationPanel';
import { SeriesRoundsView, type RoundsViewProps } from './SeriesRoundsView';
import { StandingsTable } from './StandingsTable';
import { TournamentHeader } from './TournamentHeader';
import { TournamentMessage, TournamentSkeleton, TournamentsUnavailable } from './TournamentStates';
import { YourTableCard } from './YourTableCard';
import { shouldAutoJoin, viewerProgressLine } from './tournament-detail-model';

/** How each format draws its rounds; a new format adds its view here (the compiler asks for it). */
const ROUNDS_VIEWS: Record<TournamentFormatId, ComponentType<RoundsViewProps>> = {
  series: SeriesRoundsView,
  knockout: KnockoutBracketView,
};

function BackToList() {
  return (
    <Link href={TOURNAMENT_ROUTES.LIST} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-amber-300/75 hover:text-amber-100" style={SERIF}>
      <ArrowLeft className="h-4 w-4" aria-hidden /> All tournaments
    </Link>
  );
}

/**
 * Drops ?join=1 once handled (so going back from the table does not open it again) and, when the
 * viewer has a pending table, fetches the ticket and opens it: the inbox "Join" action.
 */
function useAutoJoin(myMatch: Parameters<typeof shouldAutoJoin>[1] | undefined, loaded: boolean, joinTable: () => Promise<boolean>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const joinRequested = searchParams.has(TOURNAMENT_QUERY.JOIN);
  const attempted = useRef(false);

  useEffect(() => {
    if (!loaded || !joinRequested || attempted.current) return;
    const join = shouldAutoJoin(joinRequested, myMatch ?? null, attempted.current);
    attempted.current = true;
    const params = new URLSearchParams(searchParams.toString());
    params.delete(TOURNAMENT_QUERY.JOIN);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    if (join) void joinTable();
  }, [loaded, joinRequested, myMatch, joinTable, router, pathname, searchParams]);
}

interface TournamentBodyProps {
  detail: TournamentDetailView;
  now: number;
  /** A failed poll while an older view is shown. */
  pollError: string | null;
  actions: TournamentActions;
  inviteCode: string | null;
  account: { signedIn: boolean };
}

/** Banners above the sections: action errors, paused polling, cancellation, the viewer's status. */
function TournamentNotices({ detail, pollError, actionError }: { detail: TournamentDetailView; pollError: string | null; actionError: string | null }) {
  const { tournament } = detail;
  const progress = tournament.status === 'registration' ? null : viewerProgressLine(detail);
  return (
    <>
      {actionError ? <Notice tone="error">{actionError}</Notice> : null}
      {pollError ? <Notice tone="warning">Live updates paused: {pollError}</Notice> : null}
      {tournament.status === 'cancelled' ? (
        <Notice tone="warning">
          <span className="inline-flex items-center gap-1.5">
            <Ban className="h-4 w-4" aria-hidden /> This tournament was cancelled.
          </span>
        </Notice>
      ) : null}
      {progress ? <Notice tone="info">{progress}</Notice> : null}
    </>
  );
}

function pendingOf<K extends TournamentActionKey>(pending: TournamentActionKey | null, keys: readonly K[]): K | null {
  return keys.find((key) => key === pending) ?? null;
}

const REGISTRATION_ACTIONS = ['register', 'withdraw'] as const;
const HOST_ACTIONS = ['start', 'cancel', 'invite'] as const;

function TournamentBody({ detail, now, pollError, actions, inviteCode, account }: TournamentBodyProps) {
  const { tournament, viewer } = detail;
  const RoundsView = ROUNDS_VIEWS[tournament.format];
  const { pending } = actions;

  return (
    <div className="space-y-4 sm:space-y-5">
      <TournamentHeader detail={detail} now={now} />
      <TournamentNotices detail={detail} pollError={pollError} actionError={actions.error} />
      {viewer.myMatch ? (
        <YourTableCard
          match={viewer.myMatch}
          now={now}
          joining={pending === 'join'}
          confirmingLeave={actions.confirmingLeave}
          onJoin={(confirmed) => void actions.joinTable(confirmed)}
          onCancel={actions.cancelJoin}
        />
      ) : null}
      {tournament.status === 'completed' ? <FinalPodium detail={detail} /> : null}
      {tournament.status === 'registration' ? (
        <RegistrationPanel
          detail={detail}
          account={account}
          returnTo={TOURNAMENT_ROUTES.detail(tournament.id, inviteCode)}
          pending={pendingOf(pending, REGISTRATION_ACTIONS)}
          onRegister={() => void actions.register()}
          onWithdraw={() => void actions.withdraw()}
        />
      ) : null}
      <HostControls
        detail={detail}
        pending={pendingOf(pending, HOST_ACTIONS)}
        onStart={() => void actions.start()}
        onCancel={() => void actions.cancel()}
        onInvite={actions.invite}
      />
      {detail.rounds.length > 0 ? (
        <RoundsView detail={detail} now={now} resolving={pending === 'resolve' ? actions.resolving : null} onResolve={(matchId) => void actions.resolve(matchId)} />
      ) : null}
      <StandingsTable detail={detail} />
      {detail.standings.length === 0 ? <EntrantsList detail={detail} /> : null}
    </div>
  );
}

function TournamentPage({ tournamentId }: { tournamentId: string }) {
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get(TOURNAMENT_QUERY.INVITE_CODE);
  const { status: accountStatus } = useAccount();
  const state = useTournament(tournamentId, inviteCode);
  const { detail } = state;
  const tableRoom = detail?.viewer.myMatch?.roomCode ?? null;
  const actions = useTournamentActions(tournamentId, { inviteCode, apply: state.apply, refresh: state.refresh, tableRoom });
  const now = useTournamentClock(state.clockOffset, detail !== null && !isSettledStatus(detail.tournament.status));
  useAutoJoin(detail?.viewer.myMatch, detail !== null, actions.joinTable);

  if (state.status === 'loading') return <TournamentSkeleton rows={4} />;
  if (state.status === 'unavailable') return <TournamentsUnavailable />;
  if (state.status === 'not_found') {
    return (
      <TournamentMessage icon={<SearchX className="h-10 w-10" strokeWidth={1.25} />} title="No such tournament">
        The link may be incomplete: private tournaments need the full invite link.
      </TournamentMessage>
    );
  }
  if (!detail) {
    return (
      <TournamentMessage
        title="The tournament could not be loaded"
        action={
          <Button onClick={() => void state.refresh()} icon={<RefreshCw className="h-4 w-4" />}>
            Try again
          </Button>
        }
      >
        {state.error}
      </TournamentMessage>
    );
  }

  const account = { signedIn: accountStatus === 'signed-in' };
  return <TournamentBody detail={detail} now={now} pollError={state.error} actions={actions} inviteCode={inviteCode} account={account} />;
}

/** /tournaments/[id]: the live, viewer-aware tournament page. */
export function TournamentPageView({ tournamentId }: { tournamentId: string }) {
  const available = useTournamentAvailability();
  return (
    <AccountShell>
      <div className="mb-3 sm:mb-4">
        <BackToList />
      </div>
      {available === false ? <TournamentsUnavailable /> : <TournamentPage tournamentId={tournamentId} />}
    </AccountShell>
  );
}
