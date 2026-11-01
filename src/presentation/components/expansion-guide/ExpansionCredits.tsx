'use client';

import { ExternalLink, Info } from 'lucide-react';
import { EXPANSION_CREDITS, type ExpansionSource } from '@/presentation/config/expansion-credits.config';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface ExpansionCreditsProps {
  sources: readonly ExpansionSource[];
  className?: string;
}

/** Credit banner for the Wizard publisher and designer, with links to the publisher's sources. */
export function ExpansionCredits({ sources, className = '' }: ExpansionCreditsProps) {
  return (
    <aside
      className={`p-3 rounded-lg border border-amber-800/30 text-[11px] leading-relaxed text-amber-500/70 ${className}`}
      style={{
        background: THEME_SURFACE.CARD_BG,
        fontFamily: 'Georgia, serif',
      }}
    >
      <p className="flex items-start gap-2">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-600/60" />
        <span>{EXPANSION_CREDITS.TEXT}</span>
      </p>
      {sources.length > 0 ? (
        <div className="mt-2 pl-5">
          <span className="text-amber-500/60 uppercase tracking-wider text-[10px]">{EXPANSION_CREDITS.SOURCES_HEADING}</span>
          <ul className="mt-1 space-y-1">
            {sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-amber-400/80 hover:text-amber-300 underline underline-offset-2 decoration-amber-700/50"
                >
                  {source.label}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
