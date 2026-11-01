'use client';

import type { ReactNode } from 'react';
import { SeasonalCorner, SeasonalDivider, useActiveTheme } from '@/presentation/components/seasonal';
import { ThemedErrorIllustration } from './ThemedErrorIllustration';
import { getErrorPageCopy, type ErrorPageKind } from './themed-error-copy';

const CORNER_SIZE = 36;

const PANEL_STYLE = {
  background: 'var(--surface)',
  border: '2px solid var(--surface-border)',
  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.45), 0 0 30px var(--glow)',
} as const;

/** Runtime errors keep the red "curse" tint; 404s follow the theme's amber scale. */
const TONE = {
  'not-found': { title: 'text-amber-200/90', body: 'text-amber-300/70', code: 'text-amber-500/80' },
  error: { title: 'text-red-200/90', body: 'text-red-200/70', code: 'text-red-400/70' },
} as const;

interface ErrorPageShellProps {
  kind: ErrorPageKind;
  /** Big label above the headline, e.g. "404". */
  code?: string;
  /** Action buttons/links. */
  children: ReactNode;
  /** Small print under the actions, e.g. an error digest. */
  footnote?: ReactNode;
}

/** Shared themed layout for not-found and error pages: seasonal mascot, themed copy, actions. */
export function ErrorPageShell({ kind, code, children, footnote }: ErrorPageShellProps) {
  const theme = useActiveTheme();
  const copy = getErrorPageCopy(theme, kind);
  const tone = TONE[kind];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="relative text-center w-full max-w-md">
        <div className="absolute -inset-8 rounded-lg blur-3xl opacity-60" style={{ background: 'var(--glow)' }} />

        <div className="relative rounded-lg overflow-hidden px-6 sm:px-10 py-10" style={PANEL_STYLE}>
          <SeasonalCorner position="top-left" size={CORNER_SIZE} />
          <SeasonalCorner position="top-right" size={CORNER_SIZE} />
          <SeasonalCorner position="bottom-left" size={CORNER_SIZE} />
          <SeasonalCorner position="bottom-right" size={CORNER_SIZE} />

          <ThemedErrorIllustration />

          {code ? <div className={`font-serif text-5xl ${tone.code} mt-2`}>{code}</div> : null}

          <SeasonalDivider className="my-4" />

          <h1 className={`font-serif text-2xl ${tone.title} mb-3`}>{copy.headline}</h1>
          <p className={`font-serif ${tone.body} mb-8`}>{copy.body}</p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">{children}</div>

          {footnote}
        </div>
      </div>
    </div>
  );
}
