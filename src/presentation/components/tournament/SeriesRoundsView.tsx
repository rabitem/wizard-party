'use client';

import { useState } from 'react';
import { LayoutGrid } from 'lucide-react';

import type { TournamentDetailView } from '@shared/application/use-cases/tournament';

import { Panel, SectionHeading } from '../account/ui';
import { MatchTableCard } from './MatchTableCard';
import { managesTables } from './tournament-detail-model';
import { defaultRoundTab, roundProgress, tableRows } from './tournament-view-model';

export interface RoundsViewProps {
  detail: TournamentDetailView;
  now: number;
  resolving: string | null;
  onResolve: (matchId: string) => void;
}

/** Swiss series: one tab per round (rounds still to come are shown, disabled), tables as cards. */
export function SeriesRoundsView({ detail, now, resolving, onResolve }: RoundsViewProps) {
  const { rounds, viewer, tournament } = detail;
  const [picked, setPicked] = useState<number | null>(null);
  const fallback = defaultRoundTab(rounds, viewer);
  const selected = rounds.find((round) => round.round === picked) ?? rounds.find((round) => round.round === fallback) ?? null;
  if (!selected) return null;
  const total = Math.max(tournament.expectedRounds, rounds.length);
  const resolvable = new Set(viewer.resolvableMatchIds);
  const hostManagesTables = managesTables(detail);
  const progress = roundProgress(selected);

  return (
    <Panel>
      <div className="p-4 sm:p-6">
        <SectionHeading
          icon={<LayoutGrid className="w-5 h-5" />}
          title="Rounds"
          description="Everyone plays every round. After round 1, tables are seated by standings so similar ranks meet."
        />
        <div role="tablist" aria-label="Rounds" className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {Array.from({ length: total }, (_, index) => {
            const number = index + 1;
            const round = rounds.find((item) => item.round === number);
            const active = round?.round === selected.round;
            return (
              <button
                key={number}
                type="button"
                role="tab"
                id={`round-tab-${number}`}
                aria-selected={active}
                aria-controls="round-panel"
                disabled={!round}
                onClick={() => setPicked(number)}
                className={`font-serif inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${active ? 'border-amber-500/60 bg-amber-900/40 text-amber-100' : 'border-amber-900/40 text-amber-200/60 hover:text-amber-100 hover:border-amber-700/50'}`}
              >
                {round?.label ?? `Round ${number}`}
              </button>
            );
          })}
        </div>
        <div id="round-panel" role="tabpanel" aria-labelledby={`round-tab-${selected.round}`}>
          <p className="mb-3 text-xs text-amber-200/50" aria-live="polite">
            {progress.complete ? 'All tables played.' : `${progress.played} of ${progress.total} tables played.`}
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {selected.matches.map((match) => (
              <MatchTableCard
                key={match.id}
                match={match}
                rows={tableRows(match, viewer.userId)}
                now={now}
                managesTables={hostManagesTables}
                canResolve={resolvable.has(match.id)}
                resolving={resolving === match.id}
                onResolve={onResolve}
              />
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
