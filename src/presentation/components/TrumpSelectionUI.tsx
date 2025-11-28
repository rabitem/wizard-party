'use client';

import { Suit, SUIT_COLORS, SUIT_SYMBOLS, SUIT_NAMES } from '@shared/domain';
import { Loader2 } from 'lucide-react';

interface TrumpSelectionUIProps {
  isDealer: boolean;
  onSelectTrump: (suit: Suit) => void;
}

export function TrumpSelectionUI({ isDealer, onSelectTrump }: TrumpSelectionUIProps) {
  const suits = [Suit.GIANTS, Suit.ELVES, Suit.DWARVES, Suit.HUMANS];

  if (!isDealer) {
    return (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        <div className="relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 to-purple-500/20 rounded-xl blur-sm" />
          <div className="relative bg-[#0a0a15]/95 backdrop-blur-sm border border-amber-500/20 rounded-xl px-5 py-3">
            <div className="flex items-center gap-3 text-amber-100">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>Dealer is choosing trump suit...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-20">
      <div className="relative">
        {/* Decorative glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-amber-500/20 rounded-2xl blur-md" />

        <div className="relative bg-[#0a0a15] border border-amber-500/30 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
          {/* Header decoration */}
          <div className="flex justify-center mb-4">
            <span className="text-amber-400 text-2xl">★</span>
          </div>

          <h2 className="text-2xl font-light text-center text-amber-100 mb-2 tracking-wide">
            Choose Trump Suit
          </h2>
          <p className="text-center text-amber-200/60 mb-8 text-sm">
            You drew a Wizard! Select the trump suit for this round.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {suits.map((suit) => (
              <button
                key={suit}
                onClick={() => onSelectTrump(suit)}
                className="group relative p-5 rounded-xl border border-amber-500/20 hover:border-amber-500/50 bg-[#15152a]/50 hover:bg-[#15152a] transition-all cursor-pointer active:scale-95"
              >
                {/* Hover glow */}
                <div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity"
                  style={{ backgroundColor: SUIT_COLORS[suit] }}
                />

                <div
                  className="text-4xl text-center mb-3 relative"
                  style={{ color: SUIT_COLORS[suit] }}
                >
                  {SUIT_SYMBOLS[suit]}
                </div>
                <div
                  className="text-center font-medium text-sm relative"
                  style={{ color: SUIT_COLORS[suit] }}
                >
                  {SUIT_NAMES[suit]}
                </div>
              </button>
            ))}
          </div>

          {/* Footer decoration */}
          <div className="flex justify-center mt-6 gap-2">
            <span className="text-amber-500/40 text-xs">✦</span>
            <span className="text-amber-500/40 text-xs">✦</span>
            <span className="text-amber-500/40 text-xs">✦</span>
          </div>
        </div>
      </div>
    </div>
  );
}
