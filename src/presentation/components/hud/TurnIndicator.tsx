'use client';

import { Trophy, Crown } from 'lucide-react';
import type { TrickResult } from '@/presentation/types';
import { NAME_SCORE_TEXT_CLASS } from '../name-score-layout';

interface TrickStatusBarProps {
  winnerName: string;
  winnerId: string;
  localPlayerId: string;
  isMobile: boolean;
  voided?: boolean;
}

function getVictoryMessage(isLocalWinner: boolean, isMobile: boolean, winnerName: string, voided = false): string {
  if (voided) {
    return isMobile ? 'The Bomb! No one wins' : 'The Bomb destroyed this trick - no one claims it';
  }
  if (isLocalWinner) {
    return isMobile ? 'Victory is thine!' : 'Victory! Thou hast claimed this trick!';
  }
  return isMobile ? `${winnerName} prevails` : `${winnerName} claims this trick`;
}

function TrickStatusBar({
  winnerName,
  winnerId,
  localPlayerId,
  isMobile,
  voided = false,
}: TrickStatusBarProps) {
  const isLocalWinner = winnerId === localPlayerId && !voided;

  return (
    <span
      className={`flex items-center gap-2 min-w-0 ${isLocalWinner ? 'text-emerald-300' : 'text-amber-300'}`}
      style={{ fontFamily: 'Georgia, serif' }}
    >
      {isLocalWinner ? (
        <Trophy className="w-4 h-4 flex-shrink-0" />
      ) : (
        <Crown className="w-4 h-4 flex-shrink-0" />
      )}
      <span className={NAME_SCORE_TEXT_CLASS}>{getVictoryMessage(isLocalWinner, isMobile, winnerName, voided)}</span>
    </span>
  );
}

interface TurnIndicatorProps {
  trickResult: TrickResult | null;
  currentPlayerName: string;
  isMyTurn: boolean;
  localPlayerId: string;
  isMobile: boolean;
}

function getOuterGlowClass(hasTrickResult: boolean, isWin: boolean): string {
  if (!hasTrickResult) return 'bg-amber-900/20';
  return isWin ? 'bg-emerald-900/30' : 'bg-amber-900/30';
}

function getContainerBorderClass(hasTrickResult: boolean, isWin: boolean): string {
  if (!hasTrickResult) return 'border-amber-700/40';
  return isWin ? 'border-emerald-700/50' : 'border-amber-600/50';
}

function getContainerBackground(hasTrickResult: boolean, isWin: boolean): string {
  if (!hasTrickResult) return 'var(--surface)';
  if (isWin) return 'linear-gradient(180deg, rgba(16,40,28,0.95) 0%, rgba(10,25,18,0.95) 100%)';
  return 'linear-gradient(180deg, color-mix(in srgb, var(--surface) 95%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 5%) 95%, transparent) 100%)';
}

function getCornerAccentClass(hasTrickResult: boolean, isWin: boolean): string {
  if (!hasTrickResult) return 'border-amber-600/40';
  return isWin ? 'border-emerald-500/40' : 'border-amber-500/40';
}

export function TurnIndicator({
  trickResult,
  currentPlayerName,
  isMyTurn,
  localPlayerId,
  isMobile,
}: TurnIndicatorProps) {
  const isWin = trickResult && trickResult.winnerId === localPlayerId && !trickResult.voided;
  const hasTrickResult = !!trickResult;
  const cornerAccentClass = getCornerAccentClass(hasTrickResult, !!isWin);

  return (
    <div className="relative max-w-full">
      <div className="relative max-w-full">
        {/* Outer glow */}
        <div className={`absolute -inset-1 rounded blur-md ${getOuterGlowClass(hasTrickResult, !!isWin)}`} />

        {/* Main container */}
        <div
          className={`relative rounded border-2 overflow-hidden ${getContainerBorderClass(hasTrickResult, !!isWin)} ${isMobile ? 'px-4 py-2.5 text-sm' : 'px-6 py-3'}`}
          style={{
            background: getContainerBackground(hasTrickResult, !!isWin),
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.4)',
          }}
        >
          {/* Corner accents */}
          <div className={`absolute top-0.5 left-0.5 w-2 h-2 border-t border-l ${cornerAccentClass}`} />
          <div className={`absolute top-0.5 right-0.5 w-2 h-2 border-t border-r ${cornerAccentClass}`} />
          <div className={`absolute bottom-0.5 left-0.5 w-2 h-2 border-b border-l ${cornerAccentClass}`} />
          <div className={`absolute bottom-0.5 right-0.5 w-2 h-2 border-b border-r ${cornerAccentClass}`} />

          {/* Content */}
          <div className="relative min-w-0">
            {trickResult ? <TrickStatusBar
                winnerName={trickResult.winnerName}
                winnerId={trickResult.winnerId}
                localPlayerId={localPlayerId}
                isMobile={isMobile}
                voided={trickResult.voided}
              /> : null}
            {!trickResult && isMyTurn ? <span
                className="text-amber-300 flex items-center gap-2"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                {isMobile ? 'Thy move!' : 'Thy turn — choose a card to play'}
              </span> : null}
            {!trickResult && !isMyTurn && (
              <span className="inline-flex items-center gap-1 min-w-0 max-w-full" style={{ fontFamily: 'Georgia, serif' }}>
                <span className="text-amber-200/60 flex-shrink-0">Awaiting</span>
                <span className="inline-flex items-baseline min-w-0">
                  <span className={`text-amber-300 inline-block max-w-[220px] align-bottom ${NAME_SCORE_TEXT_CLASS}`}>{currentPlayerName}</span>
                  {!isMobile && <span className="text-amber-600/50 flex-shrink-0">...</span>}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
