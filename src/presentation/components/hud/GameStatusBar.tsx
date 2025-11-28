'use client';

import { Suit } from '@shared/domain';

interface GameStatusBarProps {
  currentRound: number;
  maxRounds: number;
  trumpSuit: Suit | null;
}

export function GameStatusBar({ currentRound, maxRounds, trumpSuit }: GameStatusBarProps) {
  return (
    <div className="absolute top-4 left-4 z-10">
      <div className="relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/10 to-purple-500/10 rounded-xl blur-sm" />
        <div className="relative backdrop-blur-sm bg-[#0a0a15]/90 text-amber-100 px-5 py-3 rounded-xl text-sm border border-amber-500/20">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-amber-400/60 text-xs uppercase tracking-wider">Round</span>
              <div className="text-amber-200 font-medium">
                {currentRound} <span className="text-amber-400/40">/</span> {maxRounds}
              </div>
            </div>
            {trumpSuit && (
              <div className="pl-4 border-l border-amber-500/20">
                <span className="text-amber-400/60 text-xs uppercase tracking-wider">Trump</span>
                <div className="text-amber-200 font-bold">{trumpSuit}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
