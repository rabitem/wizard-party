'use client';

import { useState } from 'react';
import { getWinnerIds } from '@shared/domain';
import {
  TabId,
  GameEndUIProps,
  usePlayerStats,
  useScoreProgression,
  useMaxScore,
  useSortedPlayers,
  useShareData,
  StandingsTab,
  RecapTab,
  StatsTab,
  GameEndHeader,
  GameEndActions,
  GameEndPodium,
} from './game-end';
import { SeasonalCorner } from './seasonal';
import { TournamentResultNotice } from './tournament/in-game';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

/** Tab configuration for game end screen */
const TAB_CONFIG = [
  { id: 'standings' as TabId, label: 'Standings', icon: 'ra-scroll-unfurled' },
  { id: 'recap' as TabId, label: 'Recap', icon: 'ra-cycle' },
  { id: 'stats' as TabId, label: 'Stats', icon: 'ra-player-king' },
];

/** Tab navigation component */
function TabNavigation({ activeTab, onTabChange }: { activeTab: TabId; onTabChange: (tab: TabId) => void }) {
  return (
    <div
      className="flex mx-4 rounded-lg overflow-hidden"
      style={{ background: 'color-mix(in srgb, color-mix(in srgb, var(--surface), black 50%) 80%, transparent)', border: '1px solid var(--surface-border)' }}
    >
      {TAB_CONFIG.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-all cursor-pointer"
          style={{
            background: activeTab === tab.id
              ? 'linear-gradient(180deg, color-mix(in srgb, var(--accent) 20%, transparent) 0%, transparent 100%)'
              : 'transparent',
            color: activeTab === tab.id ? 'var(--accent-bright)' : 'var(--accent-dim)',
            borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
          }}
        >
          <i className={`ra ${tab.icon} text-sm`} />
          {tab.label}
        </button>
      ))}
    </div>
  );
}

const CORNER_SIZE = 32;

/** Seasonal corner ornaments (theme emblem per UI theme) */
function CornerOrnaments() {
  return (
    <>
      <SeasonalCorner position="top-left" size={CORNER_SIZE} />
      <SeasonalCorner position="top-right" size={CORNER_SIZE} />
      <SeasonalCorner position="bottom-left" size={CORNER_SIZE} />
      <SeasonalCorner position="bottom-right" size={CORNER_SIZE} />
    </>
  );
}

export function GameEndUI({
  players,
  localPlayerId,
  maxRounds,
  onPlayAgain,
  onReturnToLobby,
  tournament = null,
}: GameEndUIProps) {
  const [activeTab, setActiveTab] = useState<TabId>('standings');

  const sortedPlayers = useSortedPlayers(players);
  const stats = usePlayerStats(players);
  const scoreProgression = useScoreProgression(players);
  const maxScore = useMaxScore(scoreProgression);

  const winner = sortedPlayers[0];
  // Co-winners (tied best score) all win; the domain ranking decides.
  const isWinner = getWinnerIds(players).includes(localPlayerId);

  const { shareUrl, shareText } = useShareData(sortedPlayers, maxRounds, stats);

  return (
    <div className="absolute inset-0 flex overflow-y-auto bg-black/90 backdrop-blur-sm z-20 p-4">
      {/* m-auto centres the card and lets a card taller than the screen scroll from its top. */}
      <div className="relative w-full max-w-md m-auto">
        {/* Outer glow */}
        <div
          className="absolute -inset-3 rounded-xl blur-2xl opacity-40"
          style={{ background: 'radial-gradient(circle, var(--glow) 0%, transparent 70%)' }}
        />

        {/* Main container - Medieval parchment style */}
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            background: 'var(--surface)',
            border: '3px solid var(--surface-border)',
            boxShadow: '0 0 24px var(--glow), inset 0 0 30px rgba(0,0,0,0.5)',
          }}
        >
          {/* Decorative top border */}
          <div
            className="h-1.5"
            style={{
              background: THEME_SURFACE.STRIP_TOP,
            }}
          />

          <CornerOrnaments />
          <GameEndHeader winner={winner} isWinner={isWinner}>
            <GameEndPodium players={players} localPlayerId={localPlayerId} />
          </GameEndHeader>
          {tournament ? <TournamentResultNotice match={tournament.match} /> : null}
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Tab content */}
          <div className="px-4 py-4 max-h-64 overflow-y-auto">
            {activeTab === 'standings' && (
              <StandingsTab
                sortedPlayers={sortedPlayers}
                localPlayerId={localPlayerId}
                stats={stats}
              />
            )}
            {activeTab === 'recap' && (
              <RecapTab
                players={players}
                localPlayerId={localPlayerId}
                maxRounds={maxRounds}
                scoreProgression={scoreProgression}
                maxScore={maxScore}
              />
            )}
            {activeTab === 'stats' && (
              <StatsTab
                players={players}
                sortedPlayers={sortedPlayers}
                localPlayerId={localPlayerId}
                stats={stats}
              />
            )}
          </div>

          {/* Actions */}
          <GameEndActions
            winner={winner}
            shareUrl={shareUrl}
            shareText={shareText}
            onPlayAgain={onPlayAgain}
            onReturnToLobby={onReturnToLobby}
            onBackToTournament={tournament?.onBackToTournament}
          />

          {/* Decorative bottom border */}
          <div
            className="h-1"
            style={{
              background: THEME_SURFACE.STRIP_BOTTOM,
            }}
          />
        </div>
      </div>
    </div>
  );
}
