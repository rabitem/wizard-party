'use client';

import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Trophy } from 'lucide-react';

import type { TournamentMatchRoomState } from '@shared/domain/tournament';

import { resultStatus, type ResultStatusTone } from './tournament-match-state';

const SERIF = { fontFamily: 'Georgia, serif' } as const;

function StatusIcon({ tone }: { tone: ResultStatusTone }) {
  switch (tone) {
    case 'recording':
      return <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" aria-hidden />;
    case 'not-counted':
      return <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" aria-hidden />;
    case 'sent':
    case 'counted':
      return <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400/90" aria-hidden />;
  }
}

/**
 * Under the results header of a tournament match: which match this was and whether the result is
 * in. A result that came too late (the table was voided first) says plainly that it does not count.
 */
export function TournamentResultNotice({ match }: { match: Pick<TournamentMatchRoomState, 'label' | 'reported' | 'reportOutcome'> }) {
  const status = resultStatus(match);
  return (
    <div className="mx-4 mb-3 flex items-start gap-2.5 rounded-lg border border-amber-700/40 px-3 py-2" style={{ background: 'color-mix(in srgb, color-mix(in srgb, var(--surface), white 6%) 60%, transparent)' }}>
      <Trophy className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" aria-hidden />
      <div className="min-w-0">
        <p className="text-sm text-amber-100 truncate" style={SERIF} title={match.label}>
          {match.label}
        </p>
        <p
          className={`mt-0.5 flex items-center gap-1.5 text-xs ${status.tone === 'not-counted' ? 'text-amber-200/90' : 'text-amber-200/60'}`}
          role="status"
          aria-live="polite"
        >
          <StatusIcon tone={status.tone} />
          {status.text}
        </p>
      </div>
    </div>
  );
}

/** The results screen's only way on from a tournament match (no rematch, no casual lobby). */
export function BackToTournamentButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full py-3 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
      style={{
        background: 'linear-gradient(180deg, var(--accent) 0%, var(--accent-deep) 100%)',
        border: '1px solid var(--accent-bright)',
        color: '#1a1510',
        boxShadow: '0 4px 16px color-mix(in srgb, var(--accent) 30%, transparent)',
        ...SERIF,
      }}
    >
      <ArrowLeft className="w-4 h-4" aria-hidden />
      Back to tournament
    </button>
  );
}
