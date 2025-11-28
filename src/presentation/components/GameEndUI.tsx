'use client';

import { IPlayer } from '@shared/domain';
import { Trophy, Medal, RotateCcw } from 'lucide-react';

interface GameEndUIProps {
  players: IPlayer[];
  localPlayerId: string;
  onPlayAgain: () => void;
}

export function GameEndUI({ players, localPlayerId, onPlayAgain }: GameEndUIProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];
  const isWinner = winner?.id === localPlayerId;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-20">
      <div className="relative">
        {/* Decorative glow */}
        <div className="absolute -inset-1 bg-gradient-to-b from-amber-500/40 via-amber-500/15 to-transparent rounded-3xl blur-xl" />

        <div className="relative bg-gradient-to-b from-[#12121f] to-[#0a0a12] border border-amber-500/20 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <span className="text-amber-400 text-3xl">★</span>
            </div>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-light text-amber-100 tracking-wide mb-2">
              Game Over
            </h1>
            <p className="text-amber-200/60">
              {isWinner ? 'Congratulations, you won!' : `${winner?.name} wins!`}
            </p>
          </div>

          <div className="space-y-2 mb-6">
            {sortedPlayers.map((player, index) => {
              const getMedalColor = (idx: number) => {
                if (idx === 0) return 'text-amber-400';
                if (idx === 1) return 'text-zinc-400';
                if (idx === 2) return 'text-amber-600';
                return 'text-amber-200/30';
              };

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                    index === 0
                      ? 'bg-amber-500/15 border border-amber-500/40'
                      : player.id === localPlayerId
                      ? 'bg-amber-500/10 border border-amber-500/30'
                      : 'bg-[#15152a]/50 border border-amber-500/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {index < 3 ? (
                      <Medal className={`w-5 h-5 ${getMedalColor(index)}`} />
                    ) : (
                      <span className="w-5 text-center text-amber-200/40 text-sm">#{index + 1}</span>
                    )}
                    <span className={`font-medium ${index === 0 ? 'text-amber-300' : 'text-amber-100'}`}>
                      {player.name}
                      {player.id === localPlayerId && (
                        <span className="text-amber-400/50 ml-2 text-sm">(You)</span>
                      )}
                    </span>
                  </div>
                  <span className={`font-bold text-lg ${index === 0 ? 'text-amber-400' : 'text-amber-100'}`}>
                    {player.score}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={onPlayAgain}
            className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:via-amber-500 hover:to-amber-500 text-white font-semibold rounded-xl transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25"
          >
            <RotateCcw className="w-4 h-4" />
            Play Again
          </button>

          {/* Footer decoration */}
          <div className="flex justify-center mt-4 gap-2">
            <span className="text-amber-500/40 text-xs">✦</span>
            <span className="text-amber-500/40 text-xs">✦</span>
            <span className="text-amber-500/40 text-xs">✦</span>
          </div>
        </div>
      </div>
    </div>
  );
}
