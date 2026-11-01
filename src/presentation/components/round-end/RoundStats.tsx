'use client';

import { IPlayer } from '@shared/domain';

interface RoundStatsProps {
  currentRound: number;
  maxRounds: number;
  players: IPlayer[];
  isMobile?: boolean;
}

export function RoundStats({ currentRound, maxRounds, players, isMobile = false }: RoundStatsProps) {
  const perfectCount = players.filter((p) => p.bid !== null && p.tricksWon === p.bid).length;
  const remainingRounds = maxRounds - currentRound;

  return (
    <div className={`${isMobile ? 'mx-2 mb-2 py-1.5 px-2' : 'mx-6 mb-4 py-3 px-4'} flex items-center justify-around rounded border border-amber-800/30 bg-black/30`}>
      <div className="text-center">
        <div className={`text-amber-400 font-bold ${isMobile ? 'text-sm' : ''}`} style={{ fontFamily: 'Georgia, serif' }}>{currentRound}</div>
        <div className={`${isMobile ? 'text-[8px]' : 'text-[9px]'} text-amber-200/40 uppercase tracking-wider`}>Cards</div>
      </div>
      <div className="text-amber-700/40">|</div>
      <div className="text-center">
        <div className={`text-emerald-400 font-bold ${isMobile ? 'text-sm' : ''}`} style={{ fontFamily: 'Georgia, serif' }}>
          {perfectCount}
        </div>
        <div className={`${isMobile ? 'text-[8px]' : 'text-[9px]'} text-amber-200/40 uppercase tracking-wider`}>Perfect</div>
      </div>
      <div className="text-amber-700/40">|</div>
      <div className="text-center">
        <div className={`text-amber-400 font-bold ${isMobile ? 'text-sm' : ''}`} style={{ fontFamily: 'Georgia, serif' }}>
          {remainingRounds}
        </div>
        <div className={`${isMobile ? 'text-[8px]' : 'text-[9px]'} text-amber-200/40 uppercase tracking-wider`}>Remain</div>
      </div>
    </div>
  );
}
