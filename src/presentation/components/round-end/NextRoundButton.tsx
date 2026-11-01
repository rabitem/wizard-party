'use client';

import { Loader2, ChevronRight } from 'lucide-react';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface NextRoundButtonProps {
  isHost: boolean;
  currentRound: number;
  onNextRound: () => void;
  isMobile?: boolean;
}

export function NextRoundButton({ isHost, currentRound, onNextRound, isMobile = false }: NextRoundButtonProps) {
  if (isHost) {
    return (
      <button
        onClick={onNextRound}
        className={`relative w-full ${isMobile ? 'py-2 text-sm' : 'py-3'} rounded border-2 border-amber-600/50 font-semibold transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2`}
        style={{
          background: THEME_SURFACE.BUTTON_BG,
          fontFamily: 'Georgia, serif',
          color: 'var(--color-amber-100)',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        }}
      >
        {/* Corner accents */}
        <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l border-amber-500/50 pointer-events-none" />
        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t border-r border-amber-500/50 pointer-events-none" />
        <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b border-l border-amber-500/50 pointer-events-none" />
        <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r border-amber-500/50 pointer-events-none" />
        <span className="relative flex items-center gap-2">
          {isMobile ? `Round ${currentRound + 1}` : `Proceed to Round ${currentRound + 1}`}
          <ChevronRight className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
        </span>
      </button>
    );
  }

  return (
    <div
      className={`flex items-center justify-center gap-2 ${isMobile ? 'py-2 px-3' : 'py-3 px-4'} rounded border border-amber-800/30 bg-black/30`}
      style={{ fontFamily: 'Georgia, serif' }}
    >
      <Loader2 className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-amber-400 animate-spin`} />
      <span className={`text-amber-200/60 ${isMobile ? 'text-xs' : 'text-sm'} italic`}>Awaiting the host...</span>
    </div>
  );
}
