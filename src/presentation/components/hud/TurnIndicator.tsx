'use client';

import { useState, useEffect } from 'react';

interface TrickResult {
  winnerId: string;
  winnerName: string;
  timestamp: number;
}

interface TrickStatusBarProps {
  winnerName: string;
  winnerId: string;
  localPlayerId: string;
  timestamp: number;
  onComplete: () => void;
  isMobile: boolean;
}

function TrickStatusBar({
  winnerName,
  winnerId,
  localPlayerId,
  timestamp,
  onComplete,
  isMobile,
}: TrickStatusBarProps) {
  const [countdown, setCountdown] = useState(5);
  const isLocalWinner = winnerId === localPlayerId;

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timestamp]);

  useEffect(() => {
    if (countdown === 0) {
      onComplete();
    }
  }, [countdown, onComplete]);

  return (
    <div className="flex items-center gap-3">
      <span className={`font-medium flex items-center gap-2 ${isLocalWinner ? 'text-emerald-300' : 'text-amber-300'}`}>
        <span className="text-lg">
          {isLocalWinner ? '🏆' : '👑'}
        </span>
        {isLocalWinner
          ? (isMobile ? 'You won!' : 'You won this trick!')
          : (isMobile ? `${winnerName} wins` : `${winnerName} wins this trick`)
        }
      </span>
      <button
        onClick={onComplete}
        className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1 rounded-lg text-amber-300 text-sm transition-colors cursor-pointer"
      >
        <span>Continue</span>
        <span className="bg-black/20 px-1.5 py-0.5 rounded text-xs font-mono">{countdown}</span>
      </button>
    </div>
  );
}

interface TurnIndicatorProps {
  trickResult: TrickResult | null;
  currentPlayerName: string;
  isMyTurn: boolean;
  localPlayerId: string;
  isMobile: boolean;
  onTrickComplete: () => void;
}

export function TurnIndicator({
  trickResult,
  currentPlayerName,
  isMyTurn,
  localPlayerId,
  isMobile,
  onTrickComplete,
}: TurnIndicatorProps) {
  return (
    <div className={`absolute left-1/2 -translate-x-1/2 z-10 ${isMobile ? 'top-16' : 'top-20'}`}>
      <div className="relative">
        <div className={`absolute -inset-0.5 rounded-xl blur-sm ${
          trickResult
            ? 'bg-gradient-to-r from-emerald-500/30 to-amber-500/30'
            : 'bg-gradient-to-r from-amber-500/20 to-purple-500/20'
        }`} />
        <div className={`relative backdrop-blur-sm bg-[#0a0a15]/90 text-white rounded-xl border ${
          trickResult ? 'border-emerald-500/30' : 'border-amber-500/20'
        } ${isMobile ? 'px-4 py-2.5 text-sm max-w-[90%]' : 'px-6 py-3'}`}>
          {trickResult ? (
            <TrickStatusBar
              winnerName={trickResult.winnerName}
              winnerId={trickResult.winnerId}
              localPlayerId={localPlayerId}
              timestamp={trickResult.timestamp}
              onComplete={onTrickComplete}
              isMobile={isMobile}
            />
          ) : isMyTurn ? (
            <span className="text-amber-300 font-medium flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              {isMobile ? 'Your turn!' : 'Your turn — select a card to play'}
            </span>
          ) : (
            <span className="text-amber-100/70">
              Waiting for{' '}
              <span className="text-amber-300 font-medium">
                {currentPlayerName}
              </span>
              {!isMobile && '...'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
