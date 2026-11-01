'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Target, TrendingUp, Flame, Medal, Crown } from 'lucide-react';
import {
  loadPlayerStats,
  resetPlayerStats,
  getWinRate,
  getBidAccuracy,
  getAverageScore,
  getAveragePlacement,
  type PlayerStats,
} from '@/lib/player-stats';
import Link from 'next/link';
import { overviewToPlayerStats } from '@/lib/account/guest-progress';
import { useAccount } from '../providers/AccountProvider';
import { GuestHint } from './account';
import { StatCard, MiniStatCard, RecentBattles, ChronicleOfDeeds, ResetConfirmation } from './stats';
import { BottomSheet } from './ui';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';
import { SeasonalCorner, SeasonalEmblem } from '@/presentation/components/seasonal';

interface StatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Empty state when no games have been played */
function EmptyStatsState() {
  return (
    <div className="text-center py-12">
      <div
        className="w-20 h-20 mx-auto mb-4 rounded-xl border-2 border-amber-700/30 flex items-center justify-center"
        style={{ background: THEME_SURFACE.CARD_BG }}
      >
        <Crown className="w-10 h-10 text-amber-600/30" />
      </div>
      <h3 className="text-lg text-amber-200/90 mb-2 font-serif">
        No Battles Fought
      </h3>
      <p className="text-sm text-amber-600/50 font-serif">
        Venture forth and prove thy worth in battle!
      </p>
    </div>
  );
}

/** Desktop stats panel header */
function DesktopStatsPanelHeader({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="relative border-b border-amber-800/30 px-5 py-4"
      style={{ background: THEME_SURFACE.HEADER_BG }}
    >
      <SeasonalCorner position="top-left" size={28} />
      <div className="absolute top-2 right-12 opacity-70"><SeasonalEmblem size={14} /></div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500/70" />
          <h2 className="text-lg text-amber-200/90 font-serif">Thy Achievements</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg border border-amber-800/40 hover:border-amber-700/50 transition-colors cursor-pointer"
          style={{ background: THEME_SURFACE.CONTROL_BG }}
        >
          <X className="w-4 h-4 text-amber-500/70" />
        </button>
      </div>
      <div className="flex items-center justify-center gap-3 mt-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-700/30 to-amber-700/20" />
        <span className="text-amber-700/50 text-xs">⚔</span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-700/30 to-amber-700/20" />
      </div>
    </div>
  );
}

/**
 * Stats content - shared between mobile and desktop views
 */
function StatsContent({
  stats,
  winRate,
  bidAccuracy,
  avgScore,
  avgPlacement,
  showResetConfirm,
  setShowResetConfirm,
  handleReset,
  isAccount,
}: {
  stats: PlayerStats;
  winRate: number;
  bidAccuracy: number;
  avgScore: number;
  avgPlacement: number;
  showResetConfirm: boolean;
  setShowResetConfirm: (show: boolean) => void;
  handleReset: () => void;
  isAccount: boolean;
}) {
  if (stats.gamesPlayed === 0) {
    return (
      <>
        <GuestHint variant="inline" className="mb-2" />
        <EmptyStatsState />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <GuestHint variant="inline" />
      {/* Hero Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Trophy className="w-4 h-4" />}
          label="Victories"
          value={`${winRate.toFixed(0)}%`}
          subtext={`${stats.gamesWon} of ${stats.gamesPlayed} battles`}
          color="amber"
        />
        <StatCard
          icon={<Target className="w-4 h-4" />}
          label="Prophecy"
          value={`${bidAccuracy.toFixed(0)}%`}
          subtext={`${stats.correctBids}/${stats.totalBids} bids true`}
          color="emerald"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStatCard
          icon={<TrendingUp className="w-4 h-4 text-blue-400" />}
          value={avgScore.toFixed(0)}
          label="Avg Score"
        />
        <MiniStatCard
          icon={<Flame className="w-4 h-4 text-orange-400" />}
          value={stats.winStreak.toString()}
          label="Best Streak"
        />
        <MiniStatCard
          icon={<Medal className="w-4 h-4 text-amber-400" />}
          value={avgPlacement > 0 ? `#${avgPlacement.toFixed(1)}` : '-'}
          label="Avg Place"
        />
      </div>

      {/* Lifetime Stats */}
      <ChronicleOfDeeds
        gamesPlayed={stats.gamesPlayed}
        totalTricksWon={stats.totalTricksWon}
        totalScore={stats.totalScore}
        highestScore={stats.highestScore}
      />

      {/* Recent Games */}
      <RecentBattles gameHistory={stats.gameHistory} />

      {/* Account stats live on the account page; guests can reset this browser's records. */}
      <div className="pt-2">
        {isAccount ? (
          <Link
            href="/account?tab=achievements"
            className="block text-center rounded-lg border border-amber-700/30 py-2.5 text-sm text-amber-300/80 hover:text-amber-100 hover:border-amber-600/50 transition-colors font-serif"
          >
            Level, achievements & full history →
          </Link>
        ) : (
          <ResetConfirmation
            showConfirm={showResetConfirm}
            onCancel={() => setShowResetConfirm(false)}
            onConfirm={handleReset}
            onShowConfirm={() => setShowResetConfirm(true)}
          />
        )}
      </div>

      {/* Bottom flourish */}
      <div className="flex justify-center pt-4 pb-2">
        <SeasonalEmblem size={14} className="opacity-70" />
      </div>
    </div>
  );
}

export function StatsPanel({ isOpen, onClose }: StatsPanelProps) {
  const [resetCounter, setResetCounter] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { overview } = useAccount();
  const stats = useMemo<PlayerStats | null>(() => {
    if (!isOpen) return null;
    void resetCounter;
    return overview ? overviewToPlayerStats(overview) : loadPlayerStats();
  }, [isOpen, resetCounter, overview]);

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

  // Mobile: use BottomSheet
  if (isMobile) {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose} title="Thy Achievements" maxHeight={85}>
        <div className="px-1">
          <StatsContent
            stats={stats}
            winRate={winRate}
            bidAccuracy={bidAccuracy}
            avgScore={avgScore}
            avgPlacement={avgPlacement}
            showResetConfirm={showResetConfirm}
            setShowResetConfirm={setShowResetConfirm}
            handleReset={handleReset}
            isAccount={overview !== null}
          />
        </div>
      </BottomSheet>
    );
  }

  // Desktop: centered modal
  return (
    <AnimatePresence>
      {isOpen ? <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 flex flex-col max-h-[85vh]"
          >
            <div className="relative flex flex-col h-full">
              {/* Glow effect */}
              <div className="absolute -inset-2 bg-gradient-to-b from-amber-500/15 via-amber-600/5 to-transparent rounded-3xl blur-2xl" />

              {/* Main container */}
              <div
                className="relative flex flex-col h-full overflow-hidden rounded-2xl border-2 border-amber-700/30"
                style={{
                  background: THEME_SURFACE.PANEL_BG,
                }}
              >
                {/* Top border decoration */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-600/40 to-transparent" />
                <DesktopStatsPanelHeader onClose={onClose} />

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <StatsContent
                    stats={stats}
                    winRate={winRate}
                    bidAccuracy={bidAccuracy}
                    avgScore={avgScore}
                    avgPlacement={avgPlacement}
                    showResetConfirm={showResetConfirm}
                    setShowResetConfirm={setShowResetConfirm}
                    handleReset={handleReset}
                    isAccount={overview !== null}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </> : null}
    </AnimatePresence>
  );
}
