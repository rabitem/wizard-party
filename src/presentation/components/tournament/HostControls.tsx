'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Ban, Crown, Play, UserPlus } from 'lucide-react';

import type { InviteToTournamentResult, TournamentDetailView } from '@shared/application/use-cases/tournament';

import { Button, Notice, Panel, SectionHeading } from '../account/ui';
import { ConfirmAction } from './ConfirmAction';
import { InviteFriendsDialog } from './InviteFriendsDialog';
import { startBlocker } from './tournament-detail-model';

function hostHint(registration: boolean, scheduled: boolean): string {
  if (!registration) return 'Tables report their results on their own. A table stuck for too long can be resolved from its card.';
  return scheduled
    ? 'The tournament starts by itself at the scheduled time if enough players registered. You can start earlier.'
    : 'Start when your field is complete. Registration closes then.';
}

export interface HostControlsProps {
  detail: TournamentDetailView;
  pending: 'start' | 'cancel' | 'invite' | null;
  onStart: () => void;
  onCancel: () => void;
  onInvite: (userIds: string[]) => Promise<InviteToTournamentResult | null>;
}

/** Host tools: start early, invite friends, cancel. Stale tables are resolved on their cards. */
export function HostControls({ detail, pending, onStart, onCancel, onInvite }: HostControlsProps) {
  const { viewer, tournament, entrants } = detail;
  const [inviting, setInviting] = useState(false);
  const entrantIds = useMemo(() => new Set(entrants.map((entrant) => entrant.userId)), [entrants]);
  const blocker = startBlocker(detail);
  const registration = tournament.status === 'registration';
  if (!viewer.isHost || !(viewer.canCancel || viewer.canInvite || registration)) return null;

  return (
    <>
      <Panel>
        <div className="p-4 sm:p-6">
          <SectionHeading
            icon={<Crown className="w-5 h-5" />}
            title="Host controls"
            description={hostHint(tournament.status === 'registration', tournament.startsAt !== null)}
          />
          <div className="flex flex-wrap gap-2">
            {registration ? (
              <ConfirmAction
                label="Start now"
                confirmLabel="Start"
                question="Close registration and seat round 1?"
                icon={<Play className="h-4 w-4" />}
                variant="primary"
                confirmVariant="primary"
                cancelLabel="Not yet"
                loading={pending === 'start'}
                disabled={!viewer.canStart}
                onConfirm={onStart}
              />
            ) : null}
            {viewer.canInvite ? (
              <Button onClick={() => setInviting(true)} icon={<UserPlus className="h-4 w-4" />}>
                Invite friends
              </Button>
            ) : null}
            {viewer.canCancel ? (
              <ConfirmAction
                label="Cancel tournament"
                confirmLabel="Cancel it"
                question="Cancel for everyone? This can't be undone."
                icon={<Ban className="h-4 w-4" />}
                variant="ghost"
                loading={pending === 'cancel'}
                onConfirm={onCancel}
              />
            ) : null}
          </div>
          {blocker ? (
            <Notice tone="info" className="mt-3">
              {blocker}
            </Notice>
          ) : null}
        </div>
      </Panel>
      <AnimatePresence>
        {inviting ? <InviteFriendsDialog entrantIds={entrantIds} sending={pending === 'invite'} onInvite={onInvite} onClose={() => setInviting(false)} /> : null}
      </AnimatePresence>
    </>
  );
}
