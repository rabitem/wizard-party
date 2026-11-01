'use client';

import { Activity, ArrowUpRight, Bot, Hourglass, ShieldAlert, UserX } from 'lucide-react';

import type { TournamentMatchView } from '@shared/application/use-cases/tournament';

import { INSET_BG } from '../account/account-surfaces';
import { ordinal } from '../account/public/public-profile-format';
import { SERIF } from '../account/ui';
import { ConfirmAction } from './ConfirmAction';
import { PlayerMonogram, PlayerName } from './TournamentPlayer';
import { matchStatusPresentation, resolveBlockedReason, type MatchTone } from './tournament-detail-model';
import type { TableRow } from './tournament-view-model';

const TONES: Record<MatchTone, string> = {
  live: 'border-rose-500/40 text-rose-200 bg-rose-950/30',
  overdue: 'border-amber-500/50 text-amber-200 bg-amber-900/30',
  done: 'border-emerald-700/40 text-emerald-200/90 bg-emerald-950/30',
  void: 'border-stone-600/40 text-stone-300 bg-stone-900/40',
};

function SeatRow({ row, played }: { row: TableRow; played: boolean }) {
  return (
    <li className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${row.isViewer ? 'bg-amber-800/25 ring-1 ring-amber-500/40' : ''}`}>
      <span className="w-7 shrink-0 text-center text-[11px] tabular-nums text-amber-400/70" style={SERIF}>
        {played && row.placement !== null ? ordinal(row.placement) : ''}
      </span>
      <PlayerMonogram name={row.displayName} isBot={row.isBot} highlight={row.isViewer} size="sm" />
      <span className="min-w-0 flex-1 text-sm">
        {row.isBot ? (
          <span className="text-amber-200/45" style={SERIF}>
            Bot
          </span>
        ) : (
          <PlayerName displayName={row.displayName} username={row.username} isViewer={row.isViewer} />
        )}
      </span>
      {row.noShow ? (
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-red-300/80" title="Did not show up">
          <UserX className="h-3 w-3" aria-hidden /> No-show
        </span>
      ) : null}
      {row.botTakeover ? (
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-amber-300/60" title="Left mid-game; a bot finished the seat">
          <Bot className="h-3 w-3" aria-hidden /> Bot finished
        </span>
      ) : null}
      {row.advanced ? (
        <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wider text-emerald-300/90" title="Advanced to the next round">
          <ArrowUpRight className="h-3 w-3" aria-hidden /> Through
        </span>
      ) : null}
      {played && row.points !== null ? (
        <span className="shrink-0 text-right tabular-nums">
          <span className="block text-sm text-amber-100" style={SERIF}>
            {row.points} pts
          </span>
          <span className="block text-[10px] text-amber-200/45">{row.score ?? 0} game</span>
        </span>
      ) : null}
    </li>
  );
}

export interface MatchTableCardProps {
  match: TournamentMatchView;
  rows: TableRow[];
  now: number;
  /** Knockout caption, e.g. "Top 2 advance". */
  caption?: string | null;
  /** The viewer hosts the running tournament (see managesTables): explains why an overdue table can't be resolved yet. */
  managesTables?: boolean;
  /** Host: this pending table is stale and may be voided. */
  canResolve?: boolean;
  resolving?: boolean;
  onResolve?: (matchId: string) => void;
}

/** One table of a round: status, seats (by placement once played), forfeits and host resolve. */
export function MatchTableCard({ match, rows, now, caption, managesTables = false, canResolve = false, resolving = false, onResolve }: MatchTableCardProps) {
  const status = matchStatusPresentation(match, now);
  const played = match.result !== null && match.result.outcome === 'played';
  const isViewerTable = rows.some((row) => row.isViewer);
  // A host never resolves their own table, so only other tables get the explanation.
  const resolveBlocked = managesTables && !canResolve && !isViewerTable ? resolveBlockedReason(match, now) : null;
  return (
    <article
      className={`rounded-2xl border px-3 py-3 sm:px-3.5 ${isViewerTable ? 'border-amber-500/50' : 'border-amber-800/30'}`}
      style={{ background: INSET_BG }}
      aria-label={`Table ${match.table}, ${status.label}`}
    >
      <header className="mb-2 flex items-center justify-between gap-2 px-1">
        <h4 className="text-sm text-amber-100" style={SERIF}>
          Table {match.table}
          {isViewerTable ? <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-400/80">your table</span> : null}
        </h4>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${TONES[status.tone]}`} style={SERIF}>
          {status.tone === 'overdue' ? <Hourglass className="h-3 w-3" aria-hidden /> : null}
          {status.label}
        </span>
      </header>
      <ol className="space-y-0.5">
        {rows.map((row) => (
          <SeatRow key={row.key} row={row} played={played} />
        ))}
      </ol>
      {caption || status.detail ? (
        <p className="mt-2 px-1 text-[11px] leading-relaxed text-amber-200/45">{[caption, status.detail].filter(Boolean).join(' · ')}</p>
      ) : null}
      {resolveBlocked ? (
        <p className="mt-2.5 flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-rose-200/70" role="note">
          <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {resolveBlocked}
        </p>
      ) : null}
      {canResolve && onResolve ? (
        <div className="mt-2.5 px-1">
          <ConfirmAction
            label="Resolve table"
            confirmLabel="Void table"
            question="Void this table? Everyone at it forfeits."
            icon={<ShieldAlert className="h-4 w-4" />}
            loading={resolving}
            onConfirm={() => onResolve(match.id)}
          />
        </div>
      ) : null}
    </article>
  );
}
