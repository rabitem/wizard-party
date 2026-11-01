'use client';

import Link from 'next/link';
import { Home, Ticket } from 'lucide-react';

import type { TournamentJoinRejection } from '@/presentation/hooks/connection/tournament-join';

import { rejectionCopy } from './tournament-match-state';

const SERIF = { fontFamily: 'Georgia, serif' } as const;

/**
 * Shown instead of the join form when the game worker refused a seat at a tournament table (no
 * ticket, an expired or foreign one, or tournaments switched off). It explains why and leads back
 * to the tournament page, which hands out a fresh ticket.
 */
export function TournamentJoinRejected({ rejection }: { rejection: Pick<TournamentJoinRejection, 'code' | 'tournamentId'> }) {
  const copy = rejectionCopy(rejection);
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-sm w-full" role="alert">
        <div className="mb-6 flex justify-center">
          <div
            className="w-16 h-16 rounded-2xl border-2 border-amber-700/50 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-amber-700) 20%, transparent) 0%, color-mix(in srgb, var(--color-amber-900) 10%, transparent) 100%)' }}
          >
            <Ticket className="w-8 h-8 text-amber-500/70" aria-hidden />
          </div>
        </div>
        <h1 className="text-2xl text-amber-100/95 mb-2" style={SERIF}>
          {copy.title}
        </h1>
        <p className="text-amber-200/55 text-sm mb-8" style={SERIF}>
          {copy.body}
        </p>
        <Link
          href={copy.action.href}
          className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-medium transition-all active:scale-[0.98] cursor-pointer"
          style={{
            background: 'linear-gradient(180deg, var(--accent-cta-top) 0%, var(--accent-cta-mid) 50%, var(--accent-cta-bottom) 100%)',
            boxShadow: '0 4px 20px color-mix(in srgb, var(--accent-deep) 30%, transparent), inset 0 1px 0 rgba(255,255,255,0.2)',
            color: '#1a1510',
            ...SERIF,
          }}
        >
          {copy.action.label}
        </Link>
        <Link href="/" className="mt-4 inline-flex items-center gap-1.5 text-amber-500/50 text-sm hover:text-amber-400 transition-colors" style={SERIF}>
          <Home className="w-3.5 h-3.5" aria-hidden />
          Home
        </Link>
      </div>
    </div>
  );
}
