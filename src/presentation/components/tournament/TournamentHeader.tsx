'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'motion/react';
import { CalendarClock, Crown, Lock, Pencil, Share2, Users } from 'lucide-react';

import type { TournamentDetailView } from '@shared/application/use-cases/tournament';

import { TOURNAMENT_ROUTES } from '@/presentation/config/tournament.config';

import { HEADER_HIGHLIGHT, TITLE_GLOW } from '../account/account-surfaces';
import { Button, Panel } from '../account/ui';
import { ShareTournamentDialog } from './ShareTournamentDialog';
import { PlayerName } from './TournamentPlayer';
import { TournamentStatusBadge } from './TournamentStatusBadge';
import { fieldLabel, scheduleLine, settingsChips } from './tournament-view-model';

/** Title card: status, name, host, schedule, setup chips, description, share and edit. */
export function TournamentHeader({ detail, now }: { detail: TournamentDetailView; now: number }) {
  const { tournament, viewer } = detail;
  const [sharing, setSharing] = useState(false);
  const shareable = tournament.status === 'registration' || tournament.status === 'running' || tournament.status === 'completed';
  // Private links need the code; only the host and entrants receive it from the server.
  const canShare = shareable && (tournament.visibility === 'public' || tournament.inviteCode !== null);

  return (
    <>
    <Panel>
      <div className="px-4 py-5 sm:px-6 sm:py-7" style={{ background: HEADER_HIGHLIGHT }}>
        <div className="flex flex-wrap items-center gap-2">
          <TournamentStatusBadge status={tournament.status} />
          {tournament.visibility === 'private' ? (
            <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-amber-400/70 font-serif">
              <Lock className="w-3 h-3" aria-hidden /> Private
            </span>
          ) : null}
        </div>
        <h1 className="mt-2 break-words text-2xl sm:text-3xl text-amber-50" style={{ fontFamily: 'var(--font-serif)', textShadow: TITLE_GLOW }}>
          {tournament.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-amber-200/60">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 shrink-0 text-amber-500/70" aria-hidden />
            Host:&nbsp;
            <PlayerName displayName={tournament.host.displayName} username={tournament.host.username} isViewer={viewer.isHost} />
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5 text-amber-500/70" aria-hidden />
            {scheduleLine(tournament, now)}
          </span>
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Users className="w-3.5 h-3.5 text-amber-500/70" aria-hidden />
            {fieldLabel(tournament)}
          </span>
        </div>
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Setup">
          {settingsChips(tournament.format, tournament.settings).map((chip) => (
            <li key={chip} className="rounded-full border border-amber-800/40 bg-black/20 px-2.5 py-1 text-[11px] text-amber-200/70 font-serif">
              {chip}
            </li>
          ))}
        </ul>
        {tournament.description ? <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-amber-100/75">{tournament.description}</p> : null}
        {canShare || viewer.canEdit ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {canShare ? (
              <Button onClick={() => setSharing(true)} icon={<Share2 className="w-4 h-4" />}>
                Share
              </Button>
            ) : null}
            {viewer.canEdit ? (
              <Link
                href={TOURNAMENT_ROUTES.edit(tournament.id)}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 min-h-11 text-sm border border-transparent text-amber-300/80 hover:text-amber-100 hover:bg-amber-900/20 transition-all font-serif"
              >
                <Pencil className="w-4 h-4" aria-hidden />
                Edit
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </Panel>
    {/* Outside the panel: its overflow clipping must not reach the fixed overlay. */}
    <AnimatePresence>
      {sharing ? <ShareTournamentDialog tournamentId={tournament.id} name={tournament.name} inviteCode={tournament.inviteCode} onClose={() => setSharing(false)} /> : null}
    </AnimatePresence>
    </>
  );
}
