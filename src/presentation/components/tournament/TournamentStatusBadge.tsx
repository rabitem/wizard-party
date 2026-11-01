'use client';

import type { TournamentStatus } from '@shared/domain/tournament';

import { SERIF } from '../account/ui';
import { statusPresentation, type StatusTone } from './tournament-view-model';

const TONES: Record<StatusTone, string> = {
  open: 'border-emerald-600/40 bg-emerald-950/40 text-emerald-200',
  live: 'border-rose-500/50 bg-rose-950/40 text-rose-100',
  done: 'border-amber-600/40 bg-amber-950/40 text-amber-200',
  cancelled: 'border-stone-600/40 bg-stone-900/40 text-stone-300',
};

export function TournamentStatusBadge({ status, className = '' }: { status: TournamentStatus; className?: string }) {
  const { label, tone } = statusPresentation(status);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-wider ${TONES[tone]} ${className}`} style={SERIF}>
      {tone === 'live' ? (
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" />
        </span>
      ) : null}
      {label}
    </span>
  );
}
