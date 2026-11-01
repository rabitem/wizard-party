'use client';

import { useLayoutEffect, useRef } from 'react';
import { Ban } from 'lucide-react';
import { getScrollLeftToReveal } from './bid-rules';

interface BidChipRowProps {
  selectedBid: number;
  maxBid: number;
  forbiddenBid: number | null;
  onBidChange: (bid: number) => void;
}

function getChipClass(isForbidden: boolean, isSelected: boolean): string {
  if (isForbidden) return 'bg-red-950/30 text-red-500/40 cursor-not-allowed border-red-900/20';
  if (isSelected) return 'bg-amber-600/40 text-amber-100 border-amber-500/60';
  return 'bg-black/20 text-amber-300/60 border-amber-800/30 hover:border-amber-700/40 hover:text-amber-200 active:scale-95';
}

/** Keeps the selected chip visible when the stepper moves it out of the scrolled range. */
function useRevealSelectedChip(selectedBid: number) {
  const rowRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const row = rowRef.current;
    const chip = row?.querySelector<HTMLElement>(`[data-bid="${selectedBid}"]`);
    if (!row || !chip) return;
    const start = chip.offsetLeft;
    row.scrollLeft = getScrollLeftToReveal(start, start + chip.offsetWidth, row.scrollLeft, row.clientWidth);
  }, [selectedBid]);
  return rowRef;
}

/**
 * Every bid of the round as a one-tap chip, in a single horizontally scrolling row so the
 * surface keeps one height in round 1 and round 20. Chips are touch-sized on coarse pointers.
 */
export function BidChipRow({ selectedBid, maxBid, forbiddenBid, onBidChange }: BidChipRowProps) {
  const rowRef = useRevealSelectedChip(selectedBid);

  return (
    <div ref={rowRef} className="hud-scroll-row relative min-w-0 overflow-x-auto overscroll-x-contain">
      <div className="mx-auto flex w-max gap-1.5 py-0.5">
        {Array.from({ length: maxBid + 1 }, (_, bid) => {
          const isForbidden = bid === forbiddenBid;
          const isSelected = bid === selectedBid;
          return (
            <button
              key={bid}
              type="button"
              data-bid={bid}
              onClick={() => onBidChange(bid)}
              disabled={isForbidden}
              aria-pressed={isSelected}
              aria-label={isForbidden ? `Bid ${bid} (forbidden)` : `Bid ${bid}`}
              className={`font-serif hud-tap-target h-8 min-w-8 flex-shrink-0 rounded-lg border px-1 text-sm font-medium transition-all cursor-pointer ${getChipClass(isForbidden, isSelected)}`}
            >
              {isForbidden ? <Ban className="mx-auto h-3.5 w-3.5" /> : bid}
            </button>
          );
        })}
      </div>
    </div>
  );
}
