'use client';

import { IPlayer } from '@shared/domain';
import { Check, X, Loader2, ChevronRight, Target, TrendingUp } from 'lucide-react';

interface RoundEndUIProps {
  players: IPlayer[];
  currentRound: number;
  maxRounds: number;
  localPlayerId: string;
  hostId: string;
  onNextRound: () => void;
}

export function RoundEndUI({
  players,
  currentRound,
  maxRounds,
  localPlayerId,
  hostId,
  onNextRound,
}: RoundEndUIProps) {
  const isHost = localPlayerId === hostId;
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const localPlayer = players.find(p => p.id === localPlayerId);
  const localMadeIt = localPlayer && localPlayer.bid !== null && localPlayer.tricksWon === localPlayer.bid;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-md z-20">
      <div className="relative max-w-md w-full mx-4">
        {/* Decorative glow */}
        <div className="absolute -inset-2 bg-gradient-to-b from-amber-500/20 via-amber-600/10 to-transparent rounded-3xl blur-2xl" />

        <div className="relative bg-gradient-to-b from-[#13131f] to-[#0a0a10] border border-amber-500/20 rounded-3xl overflow-hidden shadow-2xl">
          {/* Header with round indicator */}
          <div className="relative px-6 pt-8 pb-6 text-center">
            {/* Background pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(251,191,36,0.08)_0%,_transparent_50%)]" />

            {/* Round badge */}
            <div className="relative inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full mb-4">
              <span className="text-amber-400 text-xs font-medium uppercase tracking-wider">Round {currentRound} of {maxRounds}</span>
            </div>

            <h2 className="relative text-3xl font-light text-amber-50 tracking-wide">
              Round Complete
            </h2>

            {/* Local player result highlight */}
            {localPlayer && (
              <div className={`relative mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl ${
                localMadeIt
                  ? 'bg-emerald-500/10 border border-emerald-500/30'
                  : 'bg-red-500/10 border border-red-500/30'
              }`}>
                {localMadeIt ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300 text-sm font-medium">You made your bid!</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 text-red-400" />
                    <span className="text-red-300 text-sm font-medium">Missed by {Math.abs(localPlayer.tricksWon - (localPlayer.bid ?? 0))}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="px-6 pb-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-amber-400/60" />
              <span className="text-xs font-medium text-amber-400/60 uppercase tracking-wider">Standings</span>
            </div>

            <div className="space-y-2">
              {sortedPlayers.map((player, index) => {
                const roundScore =
                  player.bid !== null && player.tricksWon === player.bid
                    ? 20 + player.tricksWon * 10
                    : -Math.abs(player.tricksWon - (player.bid ?? 0)) * 10;
                const madeIt = player.bid !== null && player.tricksWon === player.bid;
                const isLocal = player.id === localPlayerId;
                const isLeader = index === 0;

                return (
                  <div
                    key={player.id}
                    className={`relative flex items-center justify-between p-3 rounded-xl transition-all ${
                      isLocal
                        ? 'bg-amber-500/15 border border-amber-400/30'
                        : 'bg-[#0d0d18] border border-amber-500/10'
                    }`}
                  >
                    {/* Position indicator */}
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isLeader
                          ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30'
                          : index === 1
                          ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white'
                          : index === 2
                          ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white'
                          : 'bg-[#15152a] text-amber-200/50 border border-amber-500/10'
                      }`}>
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-medium truncate ${isLocal ? 'text-amber-200' : 'text-amber-100/90'}`}>
                            {player.name}
                          </span>
                          {isLocal && (
                            <span className="text-[10px] text-amber-400/60 uppercase">you</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-amber-200/40">
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {player.bid}
                          </span>
                          <span>→</span>
                          <span>{player.tricksWon} won</span>
                        </div>
                      </div>
                    </div>

                    {/* Score section */}
                    <div className="flex items-center gap-3">
                      <div className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        madeIt
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {roundScore > 0 ? '+' : ''}{roundScore}
                      </div>
                      <div className="text-right min-w-[50px]">
                        <div className="text-amber-100 font-semibold">{player.score}</div>
                        <div className="text-[10px] text-amber-400/40 uppercase">total</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action area */}
          <div className="px-6 pb-6">
            {isHost ? (
              <button
                onClick={onNextRound}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-xl font-semibold transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20"
              >
                Continue to Round {currentRound + 1}
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <div className="flex items-center justify-center gap-3 py-4 px-4 bg-[#0d0d18] rounded-xl border border-amber-500/10">
                <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                <span className="text-amber-200/70 text-sm">
                  Waiting for host to continue...
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
