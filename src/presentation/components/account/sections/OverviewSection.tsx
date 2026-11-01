'use client';

import { Crown, Flame, Medal, ScrollText, Swords, Target, TrendingUp, Trophy, Zap } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { getAveragePlacement, getAverageScore, getBidAccuracy, getWinRate } from '@shared/domain/account';

import type { AccountOverviewDto } from '@/lib/account/account-api';

import { INSET_RAISED_BG } from '../account-surfaces';
import { Button, Notice, Panel, SERIF, SectionHeading } from '../ui';
import { GameRow } from './GameHistoryRow';
import { ImportGuestCard } from './ImportGuestCard';
import { useGamePins } from './useGamePins';

/** Recent games listed on the overview; the history tab has all of them. */
const RECENT_GAMES_SHOWN = 8;

const percent = (value: number) => `${Math.round(value * 100)}%`;

function StatTile({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-amber-800/30 p-3 sm:p-4" style={{ background: INSET_RAISED_BG }}>
      <div className="flex items-center gap-1.5 text-amber-500/70 text-[10px] sm:text-[11px] uppercase tracking-wider" style={SERIF}>
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5 text-xl sm:text-2xl text-amber-50 tabular-nums" style={SERIF}>{value}</div>
      {sub ? <div className="text-[11px] text-amber-200/40 mt-0.5 truncate">{sub}</div> : null}
    </div>
  );
}

function RecentGames({ overview, onShowHistory }: { overview: AccountOverviewDto; onShowHistory?: () => void }) {
  const pins = useGamePins();
  const [expanded, setExpanded] = useState<string | null>(null);
  if (overview.recentGames.length === 0) return null;
  return (
    <Panel accent={false}>
      <div className="p-4 sm:p-5">
        <SectionHeading
          icon={<Swords className="w-4 h-4" />}
          title="Recent battles"
          description="Pin a game to show it on your profile."
        />
        {pins.error ? <Notice tone="error" className="mb-3">{pins.error}</Notice> : null}
        <ul className="divide-y divide-amber-800/20">
          {overview.recentGames.slice(0, RECENT_GAMES_SHOWN).map((game) => (
            <GameRow
              key={game.clientGameId}
              game={game}
              expanded={expanded === game.clientGameId}
              onToggleExpanded={() => setExpanded((current) => (current === game.clientGameId ? null : game.clientGameId))}
              pin={{
                pinned: pins.pinnedAt(game) !== null,
                busy: pins.isBusy(game.clientGameId),
                // The overview does not know the total pin count; the server enforces the limit.
                disabled: false,
                onToggle: () => void pins.toggle(game),
              }}
            />
          ))}
        </ul>
        {onShowHistory ? (
          <Button block variant="secondary" className="mt-4" icon={<ScrollText className="w-4 h-4" />} onClick={onShowHistory}>
            View full history
          </Button>
        ) : null}
      </div>
    </Panel>
  );
}

export function OverviewSection({
  overview,
  onImported,
  onShowHistory,
}: {
  overview: AccountOverviewDto;
  onImported: () => void;
  /** Switches to the history tab. */
  onShowHistory?: () => void;
}) {
  const { stats } = overview;
  return (
    <div className="space-y-4 sm:space-y-5">
      <ImportGuestCard onImported={onImported} />
      <Panel accent={false}>
        <div className="p-4 sm:p-5">
          <SectionHeading icon={<TrendingUp className="w-4 h-4" />} title="Statistics" description={stats.gamesPlayed === 0 ? 'Finish a game to start your chronicle.' : undefined} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <StatTile icon={<Swords className="w-3.5 h-3.5" />} label="Games" value={stats.gamesPlayed.toLocaleString()} sub={`${stats.totalRounds.toLocaleString()} rounds`} />
            <StatTile icon={<Trophy className="w-3.5 h-3.5" />} label="Win rate" value={percent(getWinRate(stats))} sub={`${stats.gamesWon} wins`} />
            <StatTile icon={<Target className="w-3.5 h-3.5" />} label="Bid accuracy" value={percent(getBidAccuracy(stats))} sub={`${stats.correctBids}/${stats.totalBids} bids`} />
            <StatTile icon={<Medal className="w-3.5 h-3.5" />} label="Avg. place" value={stats.gamesPlayed ? getAveragePlacement(stats).toFixed(1) : '–'} />
            <StatTile icon={<Zap className="w-3.5 h-3.5" />} label="Avg. score" value={stats.gamesPlayed ? Math.round(getAverageScore(stats)).toString() : '–'} />
            <StatTile icon={<Crown className="w-3.5 h-3.5" />} label="Best score" value={stats.gamesPlayed ? stats.highestScore.toString() : '–'} />
            <StatTile icon={<Flame className="w-3.5 h-3.5" />} label="Best streak" value={stats.bestWinStreak.toString()} sub={stats.currentWinStreak > 0 ? `${stats.currentWinStreak} running` : undefined} />
            <StatTile icon={<Target className="w-3.5 h-3.5" />} label="Tricks won" value={stats.totalTricksWon.toLocaleString()} />
          </div>
        </div>
      </Panel>
      <RecentGames overview={overview} onShowHistory={onShowHistory} />
    </div>
  );
}
