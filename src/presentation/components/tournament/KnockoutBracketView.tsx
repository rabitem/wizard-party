'use client';

import { useMemo } from 'react';
import { Crown, Network } from 'lucide-react';

import { Panel, SERIF, SectionHeading } from '../account/ui';
import { MatchTableCard } from './MatchTableCard';
import type { RoundsViewProps } from './SeriesRoundsView';
import { advanceCaption, managesTables } from './tournament-detail-model';
import { advanceLabel, advancingAt, bracketColumns } from './tournament-view-model';

/** Elimination bracket: a column per round (scrolls sideways on phones), the Final last. */
export function KnockoutBracketView({ detail, now, resolving, onResolve }: RoundsViewProps) {
  const { rounds, viewer, tournament } = detail;
  const columns = useMemo(() => bracketColumns(rounds, tournament.expectedRounds, viewer.userId), [rounds, tournament.expectedRounds, viewer.userId]);
  const resolvable = new Set(viewer.resolvableMatchIds);
  const hostManagesTables = managesTables(detail);

  return (
    <Panel>
      <div className="p-4 sm:p-6">
        <SectionHeading icon={<Network className="w-5 h-5" />} title="Bracket" description={`${advanceLabel(tournament.settings.advancePerTable)}. The last table standing is the Final.`} />
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6" role="region" aria-label="Bracket" tabIndex={0}>
          <ol className="flex min-w-min gap-3">
            {columns.map((column) => (
              <li key={column.round} className="w-[min(18rem,80vw)] shrink-0" aria-label={column.label}>
                <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
                  <h3 className={`flex items-center gap-1.5 text-sm ${column.isFinal ? 'text-amber-300' : 'text-amber-100'}`} style={SERIF}>
                    {column.isFinal ? <Crown className="h-4 w-4" aria-hidden /> : null}
                    {column.label}
                  </h3>
                  {column.upcoming ? null : (
                    <span className="text-[11px] tabular-nums text-amber-200/45">
                      {column.progress.played}/{column.progress.total} played
                    </span>
                  )}
                </div>
                {column.upcoming ? (
                  <div className="rounded-2xl border border-dashed border-amber-800/40 px-3 py-6 text-center text-xs text-amber-200/35" style={SERIF}>
                    To be decided
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {column.matches.map(({ match, rows }) => (
                      <MatchTableCard
                        key={match.id}
                        match={match}
                        rows={rows}
                        now={now}
                        caption={column.isFinal ? 'Decides the podium' : advanceCaption(advancingAt(match, tournament.settings.advancePerTable))}
                        managesTables={hostManagesTables}
                        canResolve={resolvable.has(match.id)}
                        resolving={resolving === match.id}
                        onResolve={onResolve}
                      />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Panel>
  );
}
