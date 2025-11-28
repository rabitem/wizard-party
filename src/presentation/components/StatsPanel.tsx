'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Target, TrendingUp, Flame, RotateCcw, Gamepad2, Hash, Zap, Medal, Clock } from 'lucide-react';
import {
  loadPlayerStats,
  resetPlayerStats,
  getWinRate,
  getBidAccuracy,
  getAverageScore,
  getAveragePlacement,
  type PlayerStats,
} from '@/lib/player-stats';

interface StatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StatsPanel({ isOpen, onClose }: StatsPanelProps) {
  const [resetCounter, setResetCounter] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Load stats using useMemo - recomputes when isOpen becomes true or after reset
  const stats = useMemo<PlayerStats | null>(() => {
    if (!isOpen) return null;
    // resetCounter dependency ensures we reload after reset
    void resetCounter;
    return loadPlayerStats();
  }, [isOpen, resetCounter]);

  const handleReset = () => {
    resetPlayerStats();
    setResetCounter((c) => c + 1);
    setShowResetConfirm(false);
  };

  if (!stats) return null;

  const winRate = getWinRate(stats);
  const bidAccuracy = getBidAccuracy(stats);
  const avgScore = getAverageScore(stats);
  const avgPlacement = getAveragePlacement(stats);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md z-50 overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="relative flex flex-col h-full">
              {/* Glow effect */}
              <div className="absolute -inset-2 bg-gradient-to-b from-amber-500/20 via-amber-600/10 to-transparent rounded-3xl blur-2xl" />

              {/* Main container */}
              <div className="relative bg-gradient-to-b from-[#13131f] to-[#0a0a10] border border-amber-500/20 rounded-3xl overflow-hidden flex flex-col h-full shadow-2xl">
                {/* Header */}
                <div className="relative px-6 pt-6 pb-4">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(251,191,36,0.08)_0%,_transparent_50%)]" />

                  <div className="relative flex items-center justify-between">
                    <h2 className="text-2xl font-light text-amber-50 tracking-wide">Your Stats</h2>
                    <button
                      onClick={onClose}
                      className="p-2 hover:bg-amber-500/10 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-amber-500/20"
                    >
                      <X className="w-5 h-5 text-amber-400/70" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 pb-6 overflow-y-auto flex-1">
                  {stats.gamesPlayed === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[#0d0d18] border border-amber-500/10 flex items-center justify-center">
                        <Trophy className="w-10 h-10 text-amber-500/20" />
                      </div>
                      <h3 className="text-lg font-medium text-amber-100 mb-2">No Games Yet</h3>
                      <p className="text-amber-200/40 text-sm">
                        Play some games to see your statistics here!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Hero Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Win Rate */}
                        <div className="bg-gradient-to-br from-amber-500/15 to-amber-600/5 rounded-2xl p-4 border border-amber-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            <span className="text-[11px] text-amber-400/60 uppercase tracking-wider">Win Rate</span>
                          </div>
                          <div className="text-3xl font-bold text-amber-100">{winRate.toFixed(0)}%</div>
                          <div className="text-xs text-amber-400/40 mt-1">{stats.gamesWon} of {stats.gamesPlayed} games</div>
                        </div>

                        {/* Bid Accuracy */}
                        <div className="bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 rounded-2xl p-4 border border-emerald-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="w-4 h-4 text-emerald-400" />
                            <span className="text-[11px] text-emerald-400/60 uppercase tracking-wider">Accuracy</span>
                          </div>
                          <div className="text-3xl font-bold text-emerald-100">{bidAccuracy.toFixed(0)}%</div>
                          <div className="text-xs text-emerald-400/40 mt-1">{stats.correctBids}/{stats.totalBids} bids</div>
                        </div>
                      </div>

                      {/* Secondary Stats Row */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-[#0d0d18] rounded-xl p-3 border border-amber-500/10 text-center">
                          <TrendingUp className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                          <div className="text-lg font-semibold text-amber-100">{avgScore.toFixed(0)}</div>
                          <div className="text-[10px] text-amber-400/40 uppercase">Avg Score</div>
                        </div>
                        <div className="bg-[#0d0d18] rounded-xl p-3 border border-amber-500/10 text-center">
                          <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                          <div className="text-lg font-semibold text-amber-100">{stats.winStreak}</div>
                          <div className="text-[10px] text-amber-400/40 uppercase">Best Streak</div>
                        </div>
                        <div className="bg-[#0d0d18] rounded-xl p-3 border border-amber-500/10 text-center">
                          <Medal className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                          <div className="text-lg font-semibold text-amber-100">#{avgPlacement > 0 ? avgPlacement.toFixed(1) : '-'}</div>
                          <div className="text-[10px] text-amber-400/40 uppercase">Avg Place</div>
                        </div>
                      </div>

                      {/* Lifetime Stats */}
                      <div className="bg-[#0a0a12] rounded-xl border border-amber-500/10 overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-amber-500/10 bg-amber-500/5">
                          <span className="text-[11px] text-amber-400/60 uppercase tracking-wider font-medium">Lifetime</span>
                        </div>
                        <div className="p-3 space-y-2">
                          <div className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2">
                              <Gamepad2 className="w-3.5 h-3.5 text-amber-400/40" />
                              <span className="text-sm text-amber-200/60">Games Played</span>
                            </div>
                            <span className="text-sm font-semibold text-amber-100">{stats.gamesPlayed}</span>
                          </div>
                          <div className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2">
                              <Hash className="w-3.5 h-3.5 text-amber-400/40" />
                              <span className="text-sm text-amber-200/60">Total Rounds</span>
                            </div>
                            <span className="text-sm font-semibold text-amber-100">{stats.totalRounds}</span>
                          </div>
                          <div className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2">
                              <Zap className="w-3.5 h-3.5 text-amber-400/40" />
                              <span className="text-sm text-amber-200/60">Tricks Won</span>
                            </div>
                            <span className="text-sm font-semibold text-amber-100">{stats.totalTricksWon}</span>
                          </div>
                          <div className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-3.5 h-3.5 text-amber-400/40" />
                              <span className="text-sm text-amber-200/60">Total Score</span>
                            </div>
                            <span className="text-sm font-semibold text-amber-100">{stats.totalScore}</span>
                          </div>
                          <div className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2">
                              <Trophy className="w-3.5 h-3.5 text-amber-400/40" />
                              <span className="text-sm text-amber-200/60">Best Score</span>
                            </div>
                            <span className="text-sm font-semibold text-emerald-400">{stats.highestScore}</span>
                          </div>
                        </div>
                      </div>

                      {/* Recent Games */}
                      {stats.gameHistory.length > 0 && (
                        <div className="bg-[#0a0a12] rounded-xl border border-amber-500/10 overflow-hidden">
                          <div className="px-4 py-2.5 border-b border-amber-500/10 bg-amber-500/5 flex items-center justify-between">
                            <span className="text-[11px] text-amber-400/60 uppercase tracking-wider font-medium">Recent Games</span>
                            <Clock className="w-3.5 h-3.5 text-amber-400/40" />
                          </div>
                          <div className="max-h-40 overflow-y-auto">
                            {stats.gameHistory
                              .slice(-5)
                              .reverse()
                              .map((game) => (
                                <div
                                  key={game.id}
                                  className="flex items-center justify-between px-4 py-2.5 border-b border-amber-500/5 last:border-b-0 hover:bg-amber-500/5 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                                        game.placement === 1
                                          ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
                                          : game.placement === 2
                                          ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white'
                                          : game.placement === 3
                                          ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white'
                                          : 'bg-[#15152a] text-amber-400/50 border border-amber-500/10'
                                      }`}
                                    >
                                      {game.placement}
                                    </div>
                                    <div>
                                      <div className="text-sm text-amber-100 font-medium">{game.score} pts</div>
                                      <div className="text-[10px] text-amber-400/40">{game.playerCount} players</div>
                                    </div>
                                  </div>
                                  <div className="text-[10px] text-amber-400/30">
                                    {new Date(game.date).toLocaleDateString()}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Reset Button */}
                      <div className="pt-2">
                        {showResetConfirm ? (
                          <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                            <span className="text-sm text-red-300">Reset all stats?</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setShowResetConfirm(false)}
                                className="px-3 py-1.5 text-xs text-amber-400/70 hover:text-amber-200 transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleReset}
                                className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors cursor-pointer"
                              >
                                Reset
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowResetConfirm(true)}
                            className="flex items-center gap-2 text-xs text-amber-400/30 hover:text-amber-300 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reset Statistics
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
