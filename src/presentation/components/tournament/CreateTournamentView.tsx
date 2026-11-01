'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

import { tournamentApi, tournamentErrorMessage } from '@/lib/tournament';
import { TOURNAMENT_ROUTES } from '@/presentation/config/tournament.config';

import { TITLE_GLOW } from '../account/account-surfaces';
import { AccountShell } from '../account/AccountShell';
import { TournamentAccessGate } from './TournamentAccessGate';
import { TournamentForm } from './TournamentForm';
import { initialFormState, toCreateInput, type TournamentFormState } from './tournament-form';

const currentTime = () => Date.now();

function CreateForm() {
  const router = useRouter();
  const [initial] = useState(() => initialFormState(Date.now()));
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const submit = useCallback(
    async (state: TournamentFormState) => {
      setSubmitting(true);
      setServerError(null);
      try {
        const created = await tournamentApi.create(toCreateInput(state));
        router.push(TOURNAMENT_ROUTES.detail(created.tournament.id, created.tournament.inviteCode));
      } catch (error) {
        setServerError(tournamentErrorMessage(error));
        setSubmitting(false);
      }
    },
    [router]
  );

  return (
    <TournamentForm
      mode="create"
      initial={initial}
      submitting={submitting}
      serverError={serverError}
      now={currentTime}
      onSubmit={submit}
      onCancel={() => router.push(TOURNAMENT_ROUTES.LIST)}
    />
  );
}

/** /tournaments/new */
export function CreateTournamentView() {
  return (
    <AccountShell width="wide">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="text-center">
          <h1 className="text-2xl sm:text-3xl text-amber-50" style={{ fontFamily: 'var(--font-serif)', textShadow: TITLE_GLOW }}>
            Host a tournament
          </h1>
          <p className="mt-1.5 text-sm text-amber-200/50">Pick a format, invite your rivals and let the cards decide.</p>
        </header>
        <TournamentAccessGate next={TOURNAMENT_ROUTES.NEW}>
          <CreateForm />
        </TournamentAccessGate>
      </div>
    </AccountShell>
  );
}
