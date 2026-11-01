'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Crown } from 'lucide-react';

import { BAR_BG, TITLE_GLOW } from './account-surfaces';
import { SERIF } from './ui';

/**
 * Page frame for account screens and a way back to the game. The root stays transparent so the
 * global SeasonalAmbience backdrop (theme background plus seasonal particles) shows through.
 */
export function AccountShell({ children, width = 'wide', action }: { children: ReactNode; width?: 'narrow' | 'wide'; action?: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-[var(--surface-border)] backdrop-blur-md" style={{ background: BAR_BG }}>
        <div className={`mx-auto ${width === 'narrow' ? 'max-w-md' : 'max-w-4xl'} px-4 sm:px-6 h-14 relative flex items-center justify-between gap-3`}>
          <Link href="/" className="inline-flex items-center gap-2 text-amber-300/80 hover:text-amber-100 text-sm min-h-11" style={SERIF}>
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to game</span>
          </Link>
          <Link href="/" className="absolute left-1/2 -translate-x-1/2 inline-flex items-center gap-2 text-amber-100" style={{ ...SERIF, textShadow: TITLE_GLOW }} aria-label="Wizard Party home">
            <Crown className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
            <span className="text-sm sm:text-base">Wizard Party</span>
          </Link>
          <div className="min-w-11 flex justify-end">{action}</div>
        </div>
      </header>
      <main className={`mx-auto ${width === 'narrow' ? 'max-w-md' : 'max-w-4xl'} px-4 sm:px-6 py-6 sm:py-10`}>{children}</main>
    </div>
  );
}
