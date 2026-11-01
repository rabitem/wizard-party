'use client';

import Link from 'next/link';
import { LogIn, LogOut, UserPlus } from 'lucide-react';

import type { TournamentDetailView } from '@shared/application/use-cases/tournament';

import { TOURNAMENT_ROUTES } from '@/presentation/config/tournament.config';

import { Button, Notice, Panel, ProgressBar, SERIF } from '../account/ui';
import { ConfirmAction } from './ConfirmAction';
import { viewerProgressLine } from './tournament-detail-model';
import { fieldLabel, registrationAction } from './tournament-view-model';

const LINK_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 min-h-11 text-sm border-2 border-amber-600/60 text-amber-100 hover:border-amber-500/80 hover:text-white transition-all';

export interface RegistrationPanelProps {
  detail: TournamentDetailView;
  account: { signedIn: boolean };
  /** Where sign-in returns to (this page, with its invite code). */
  returnTo: string;
  pending: 'register' | 'withdraw' | null;
  onRegister: () => void;
  onWithdraw: () => void;
}

/** Sign-up box of a tournament in registration: how full it is and the viewer's one next step. */
export function RegistrationPanel({ detail, account, returnTo, pending, onRegister, onWithdraw }: RegistrationPanelProps) {
  const { tournament, viewer } = detail;
  const action = registrationAction(tournament.status, viewer, account);
  const progress = viewerProgressLine(detail);

  return (
    <Panel>
      <div className="space-y-4 p-4 sm:p-6">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="text-amber-100" style={SERIF}>
              Registration
            </span>
            <span className="tabular-nums text-amber-200/60">{fieldLabel(tournament)}</span>
          </div>
          <ProgressBar value={tournament.entrantCount} max={tournament.maxEntrants} />
          <p className="mt-1.5 text-xs text-amber-200/45">
            Needs {tournament.minimumEntrants} players to start{tournament.settings.fillWithBots ? '; bots fill the tables' : ''}.
          </p>
        </div>

        {progress ? <Notice tone="success">{progress}</Notice> : null}

        <div className="flex flex-wrap gap-2">
          {action.kind === 'register' ? (
            <Button variant="primary" onClick={onRegister} loading={pending === 'register'} icon={<UserPlus className="h-4 w-4" />}>
              Register
            </Button>
          ) : null}
          {action.kind === 'withdraw' ? (
            <ConfirmAction
              label="Withdraw"
              confirmLabel="Withdraw"
              question="Give up your spot?"
              icon={<LogOut className="h-4 w-4" />}
              variant="ghost"
              loading={pending === 'withdraw'}
              onConfirm={onWithdraw}
            />
          ) : null}
          {action.kind === 'sign_in' ? (
            <Link href={TOURNAMENT_ROUTES.signIn(returnTo)} className={LINK_CLASS} style={SERIF}>
              <LogIn className="h-4 w-4" aria-hidden /> Sign in to register
            </Link>
          ) : null}
        </div>
        {action.kind === 'full' ? <Notice tone="warning">The field is full. A spot opens if someone withdraws.</Notice> : null}
        {action.kind === 'closed' ? <Notice>Registration is closed.</Notice> : null}
      </div>
    </Panel>
  );
}
