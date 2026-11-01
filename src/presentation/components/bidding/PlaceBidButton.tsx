'use client';

import { Check } from 'lucide-react';
import { canSubmitBid } from './bid-rules';
import { useClickLock } from '../ui';

/** One second lock against double-submitting a bid while the server answers */
const PLACE_BID_LOCK_MS = 1000;

interface PlaceBidButtonProps {
  selectedBid: number;
  maxBid: number;
  forbiddenBid: number | null;
  onPlaceBid: (bid: number) => void;
  /** Stretch to the container width (sheet footer) instead of sizing to the label */
  fullWidth?: boolean;
  /** Short label ("Bid 3") for the compact panel on landscape phones */
  compact?: boolean;
}

/** The primary bidding action, shared by the bidding panel and the bidding sheet footer. */
export function PlaceBidButton({ selectedBid, maxBid, forbiddenBid, onPlaceBid, fullWidth = false, compact = false }: PlaceBidButtonProps) {
  const tryClick = useClickLock(PLACE_BID_LOCK_MS);
  const canSubmit = canSubmitBid({ selectedBid, maxBid, forbiddenBid });

  const handleClick = () => {
    if (!canSubmit) return;
    tryClick(() => onPlaceBid(selectedBid));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!canSubmit}
      aria-label={`Place bid ${selectedBid}`}
      className={`hud-tap-target flex flex-shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-amber-600/50 font-medium transition-all cursor-pointer active:scale-[0.98] hover:border-amber-500/70 disabled:cursor-not-allowed disabled:opacity-50 ${fullWidth ? 'w-full py-3 text-base' : 'px-4 py-2'}`}
      style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-600) 50%, transparent) 0%, color-mix(in srgb, var(--color-amber-800) 40%, transparent) 100%)', fontFamily: 'Georgia, serif', color: 'var(--color-amber-100)' }}
    >
      <Check className="h-4 w-4" />
      {compact ? `Bid ${selectedBid}` : `Place Bid: ${selectedBid}`}
    </button>
  );
}
