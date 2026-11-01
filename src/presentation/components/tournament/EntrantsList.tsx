'use client';

import { Crown, Users } from 'lucide-react';

import type { TournamentDetailView } from '@shared/application/use-cases/tournament';

import { INSET_BG } from '../account/account-surfaces';
import { Panel, SectionHeading } from '../account/ui';
import { PlayerMonogram, PlayerName } from './TournamentPlayer';
import { fieldLabel } from './tournament-view-model';

/** The registered field by seed, with levels; the host and the viewer are marked. */
export function EntrantsList({ detail }: { detail: TournamentDetailView }) {
  const { entrants, tournament, viewer } = detail;
  const registration = tournament.status === 'registration';
  return (
    <Panel>
      <div className="p-4 sm:p-6">
        <SectionHeading
          icon={<Users className="w-5 h-5" />}
          title="Players"
          description={registration ? `${fieldLabel(tournament)} registered. Seeds are set by level when the tournament starts.` : `${entrants.length} players, by seed.`}
        />
        {entrants.length === 0 ? (
          <p className="rounded-xl border border-dashed border-amber-800/40 px-4 py-6 text-center text-sm text-amber-200/45 font-serif">
            Nobody has registered yet.
          </p>
        ) : (
          <ol className="grid gap-1.5 sm:grid-cols-2">
            {entrants.map((entrant) => {
              const isViewer = entrant.userId === viewer.userId;
              return (
                <li
                  key={entrant.userId}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${isViewer ? 'border-amber-500/50' : 'border-amber-900/30'}`}
                  style={{ background: INSET_BG }}
                >
                  <span className="w-6 shrink-0 text-center text-[11px] tabular-nums text-amber-500/60 font-serif" aria-label={registration ? undefined : `Seed ${entrant.seed}`}>
                    {registration ? '' : entrant.seed}
                  </span>
                  <PlayerMonogram name={entrant.displayName} highlight={isViewer} />
                  <span className="min-w-0 flex-1 text-sm">
                    <PlayerName displayName={entrant.displayName} username={entrant.username} isViewer={isViewer} />
                    <span className="block text-[11px] text-amber-200/40">Level {entrant.level}</span>
                  </span>
                  {entrant.userId === tournament.host.userId ? <Crown className="h-4 w-4 shrink-0 text-amber-400/70" aria-label="Host" /> : null}
                  {entrant.status === 'eliminated' && tournament.status === 'running' ? (
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-red-300/60 font-serif">
                      out
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Panel>
  );
}
