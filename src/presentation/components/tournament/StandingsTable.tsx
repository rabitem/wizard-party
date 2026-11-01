'use client';

import { ListOrdered } from 'lucide-react';

import type { TournamentDetailView } from '@shared/application/use-cases/tournament';

import { Panel, SERIF, SectionHeading } from '../account/ui';
import { PlayerName } from './TournamentPlayer';
import { reachedLabel } from './tournament-detail-model';
import { formatAccuracy } from './tournament-view-model';

const HEAD = 'px-2 py-2 text-[10px] font-normal uppercase tracking-wider text-amber-400/60';
const CELL = 'px-2 py-2.5 tabular-nums';

/** Standings with the format's tie-breakers as columns; secondary columns hide on phones. */
export function StandingsTable({ detail }: { detail: TournamentDetailView }) {
  const { standings, tournament, viewer, rounds } = detail;
  if (standings.length === 0) return null;
  const knockout = tournament.format === 'knockout';
  const settled = tournament.status === 'completed';

  return (
    <Panel>
      <div className="p-4 sm:p-6">
        <SectionHeading
          icon={<ListOrdered className="w-5 h-5" />}
          title={settled ? 'Final standings' : 'Standings'}
          description={
            knockout
              ? 'Ranked by the round reached, then the placement and score at that table.'
              : 'Ranked by points, then table wins, total game score and bid accuracy.'
          }
        />
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full text-left text-sm" style={SERIF}>
            <caption className="sr-only">{settled ? 'Final standings' : 'Current standings'}</caption>
            <thead>
              <tr className="border-b border-amber-800/30">
                <th scope="col" className={`${HEAD} w-10 text-center`}>
                  #
                </th>
                <th scope="col" className={HEAD}>
                  Player
                </th>
                {knockout ? (
                  <th scope="col" className={HEAD}>
                    Reached
                  </th>
                ) : null}
                <th scope="col" className={`${HEAD} text-right`}>
                  Points
                </th>
                <th scope="col" className={`${HEAD} hidden text-right sm:table-cell`}>
                  Wins
                </th>
                <th scope="col" className={`${HEAD} hidden text-right sm:table-cell`}>
                  Score
                </th>
                <th scope="col" className={`${HEAD} hidden text-right md:table-cell`}>
                  Bids hit
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing) => {
                const isViewer = standing.userId === viewer.userId;
                const out = standing.status === 'eliminated' && !settled;
                return (
                  <tr
                    key={standing.userId}
                    aria-current={isViewer ? 'true' : undefined}
                    className={`border-b border-amber-900/20 last:border-0 ${isViewer ? 'bg-amber-800/20' : ''} ${out ? 'text-amber-200/45' : 'text-amber-100/90'}`}
                  >
                    <td className={`${CELL} text-center text-amber-300/80`}>{standing.rank}</td>
                    <td className="max-w-[12rem] px-2 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <PlayerName displayName={standing.displayName} username={standing.username} isViewer={isViewer} />
                        {out ? <span className="shrink-0 text-[10px] uppercase tracking-wider text-red-300/60">out</span> : null}
                      </div>
                    </td>
                    {knockout ? <td className="px-2 py-2.5 text-xs text-amber-200/70">{reachedLabel(standing.reachedRound, rounds)}</td> : null}
                    <td className={`${CELL} text-right text-amber-50`}>{standing.points}</td>
                    <td className={`${CELL} hidden text-right sm:table-cell`}>{standing.tableWins}</td>
                    <td className={`${CELL} hidden text-right sm:table-cell`}>{standing.totalScore}</td>
                    <td className={`${CELL} hidden text-right md:table-cell`}>{formatAccuracy(standing.bidAccuracy)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}
