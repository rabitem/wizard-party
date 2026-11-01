'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { TournamentDetailView } from '@shared/application/use-cases/tournament';

import { isNotFound, isTournamentsUnavailable, tournamentApi, tournamentErrorMessage } from '@/lib/tournament';
import { TOURNAMENT_ROUTES } from '@/presentation/config/tournament.config';

import { TITLE_GLOW } from '../account/account-surfaces';
import { AccountShell } from '../account/AccountShell';
import { SERIF } from '../account/ui';
import { TournamentAccessGate } from './TournamentAccessGate';
import { TournamentForm } from './TournamentForm';
import { TournamentMessage, TournamentSkeleton, TournamentsUnavailable } from './TournamentStates';
import { formStateFromTournament, startsAtChanged, toChangesInput, type TournamentFormState } from './tournament-form';

const currentTime = () => Date.now();

type Loaded =
  | { kind: 'loading' }
  | { kind: 'ready'; detail: TournamentDetailView; original: TournamentFormState }
  | { kind: 'not_found' }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string };

function BackLink({ tournamentId }: { tournamentId: string }) {
  return (
    <Link href={TOURNAMENT_ROUTES.detail(tournamentId)} className="text-sm text-amber-300/80 underline underline-offset-2 hover:text-amber-100" style={SERIF}>
      Back to the tournament
    </Link>
  );
}

function EditForm({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded>({ kind: 'loading' });
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    tournamentApi.get(tournamentId, null, abort.signal).then(
      (detail) => setLoaded({ kind: 'ready', detail, original: formStateFromTournament(detail.tournament, Date.now()) }),
      (error) => {
        if (abort.signal.aborted) return;
        if (isNotFound(error)) setLoaded({ kind: 'not_found' });
        else if (isTournamentsUnavailable(error)) setLoaded({ kind: 'unavailable' });
        else setLoaded({ kind: 'error', message: tournamentErrorMessage(error) });
      }
    );
    return () => abort.abort();
  }, [tournamentId]);

  const original = loaded.kind === 'ready' ? loaded.original : null;
  const submit = useCallback(
    async (state: TournamentFormState) => {
      if (!original) return;
      const changes = toChangesInput(state, original);
      if (!changes) {
        router.push(TOURNAMENT_ROUTES.detail(tournamentId));
        return;
      }
      setSubmitting(true);
      setServerError(null);
      try {
        await tournamentApi.update(tournamentId, changes);
        router.push(TOURNAMENT_ROUTES.detail(tournamentId));
      } catch (error) {
        setServerError(tournamentErrorMessage(error));
        setSubmitting(false);
      }
    },
    [original, router, tournamentId]
  );
  const isStartsAtChanged = useCallback((state: TournamentFormState) => (original ? startsAtChanged(state, original) : true), [original]);

  if (loaded.kind === 'loading') return <TournamentSkeleton rows={3} />;
  if (loaded.kind === 'unavailable') return <TournamentsUnavailable />;
  if (loaded.kind === 'not_found') return <TournamentMessage title="No such tournament">It may have been cancelled, or the link is incomplete.</TournamentMessage>;
  if (loaded.kind === 'error') return <TournamentMessage title="The tournament could not be loaded">{loaded.message}</TournamentMessage>;
  if (!loaded.detail.viewer.canEdit) {
    return (
      <TournamentMessage title="This tournament can't be edited" action={<BackLink tournamentId={tournamentId} />}>
        Only the host can change a tournament, and only while registration is open.
      </TournamentMessage>
    );
  }
  return (
    <TournamentForm
      mode="edit"
      initial={loaded.original}
      registeredCount={loaded.detail.entrants.length}
      isStartsAtChanged={isStartsAtChanged}
      submitting={submitting}
      serverError={serverError}
      now={currentTime}
      onSubmit={submit}
      onCancel={() => router.push(TOURNAMENT_ROUTES.detail(tournamentId))}
    />
  );
}

/** /tournaments/[id]/edit (host, registration only). */
export function EditTournamentView({ tournamentId }: { tournamentId: string }) {
  return (
    <AccountShell width="wide">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="text-center">
          <h1 className="text-2xl sm:text-3xl text-amber-50" style={{ ...SERIF, textShadow: TITLE_GLOW }}>
            Edit tournament
          </h1>
          <p className="mt-1.5 text-sm text-amber-200/50">Changes apply to everyone registered.</p>
        </header>
        <TournamentAccessGate next={TOURNAMENT_ROUTES.edit(tournamentId)}>
          <EditForm tournamentId={tournamentId} />
        </TournamentAccessGate>
      </div>
    </AccountShell>
  );
}
