'use client';

import { getCardCatalogEntry } from '@shared/domain';
import { MINI_CARD_STYLES } from '../bidding/mini-card-styles';
import type { RoundInfoLine } from './special-card-view-model';

/**
 * Compact reminder of round facts set by special cards (Werewolf swap, Vampire copy).
 */
export function SpecialCardRoundInfo({ lines, isMobile }: { lines: RoundInfoLine[]; isMobile: boolean }) {
  if (lines.length === 0) return null;

  return (
    <div className={`fixed left-3 z-20 flex flex-col gap-1 pointer-events-none ${isMobile ? 'top-28' : 'top-36'}`}>
      {lines.map((line) => {
        const style = MINI_CARD_STYLES[line.cardType];
        return (
          <div
            key={line.cardType}
            className={`flex items-center gap-1.5 px-2 py-1 border ${style.borderClass} text-[10px] sm:text-xs`}
            style={{ background: 'color-mix(in srgb, color-mix(in srgb, var(--surface), black 50%) 85%, transparent)', fontFamily: 'var(--font-serif)' }}
          >
            <span className={`font-bold ${style.textClass}`}>{getCardCatalogEntry(line.cardType).name}</span>
            <span className="text-amber-100/80">{line.text}</span>
          </div>
        );
      })}
    </div>
  );
}
