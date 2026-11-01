'use client';

import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface BiddingFABProps {
  isMyTurn: boolean;
  bidsPlaced: number;
  totalPlayers: number;
  onExpand: () => void;
}

/**
 * Button that reopens the bidding sheet after it was dismissed; rendered into the HUD controls
 * region (bottom-right, above the controls button), clear of the hand in the bottom centre.
 */
export function BiddingFAB({ isMyTurn, bidsPlaced, totalPlayers, onExpand }: BiddingFABProps) {
  return (
    <div className="relative m-2">
      {/* Outer magical glow when it's your turn */}
      {isMyTurn ? (
        <>
          <div
            className="absolute inset-0 -m-3 rounded-full animate-ping opacity-30"
            style={{ background: 'radial-gradient(circle, var(--color-amber-400) 0%, transparent 70%)' }}
          />
          <div
            className="absolute inset-0 -m-2 rounded-full animate-pulse"
            style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--color-amber-500) 40%, transparent) 0%, transparent 60%)' }}
          />
        </>
      ) : null}

      <button
        type="button"
        onClick={onExpand}
        aria-label={isMyTurn ? 'Open bidding: your turn' : `Open bidding: ${bidsPlaced} of ${totalPlayers} have bid`}
        className="group relative w-16 h-16 cursor-pointer active:scale-95 transition-all"
      >
        {/* Background with gradient */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: isMyTurn
              ? 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-600) 95%, transparent) 0%, color-mix(in srgb, var(--color-amber-900) 95%, transparent) 100%)'
              : THEME_SURFACE.MODAL_BG,
            boxShadow: isMyTurn
              ? '0 4px 24px color-mix(in srgb, var(--color-amber-500) 50%, transparent), inset 0 1px 0 rgba(255,255,255,0.1)'
              : '0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        />

        {/* Border ring */}
        <div
          className={`absolute inset-0 rounded-full border-2 ${
            isMyTurn ? 'border-amber-400/80' : 'border-amber-700/50'
          }`}
        />

        {/* Inner decorative ring */}
        <div
          className={`absolute inset-1.5 rounded-full border ${
            isMyTurn ? 'border-amber-500/40' : 'border-amber-800/30'
          }`}
        />

        {/* Medieval rune corners - simulated with small dots */}
        {isMyTurn ? (
          <>
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400/60" />
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400/60" />
            <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-amber-400/60" />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-amber-400/60" />
          </>
        ) : null}

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isMyTurn ? (
            <>
              <i className="ra ra-scroll-unfurled text-xl text-amber-200" />
              <span
                className="text-[8px] font-bold text-amber-200 uppercase tracking-wider mt-0.5 font-serif"
              >
                Bid!
              </span>
            </>
          ) : (
            <>
              <i className="ra ra-hourglass text-lg text-amber-500/70" />
              <span
                className="text-[8px] text-amber-500/70 uppercase tracking-wide mt-0.5 font-serif"
              >
                {bidsPlaced}/{totalPlayers}
              </span>
            </>
          )}
        </div>
      </button>
    </div>
  );
}
