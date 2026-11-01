'use client';

import { useState } from 'react';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';
import { IPlayer } from '@shared/domain';
import { PlayerStats } from './types';
import { getMedalDisplay } from './hooks';
import { SeatFriendAction } from '../friends';
import {
  NAME_SCORE_LEFT_CLASS,
  NAME_SCORE_TEXT_FLEX_CLASS,
  NAME_SCORE_VALUE_CLASS,
  getNameScoreValueStyle,
} from '../name-score-layout';

interface StandingsTabProps {
  sortedPlayers: IPlayer[];
  localPlayerId: string;
  stats: Record<string, PlayerStats>;
}

/** Round history expansion panel for a player */
function RoundHistory({ player }: { player: IPlayer }) {
  return (
    <div className="mt-2 ml-4 p-3 rounded-lg" style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--surface-border)' }}>
      <div className="text-xs font-medium mb-2" style={{ color: 'var(--accent)' }}>Round History</div>
      <div className="grid grid-cols-4 gap-1 text-xs mb-1 px-1" style={{ color: 'var(--accent-dim)' }}>
        <span>Rnd</span>
        <span className="text-center">Bid</span>
        <span className="text-center">Won</span>
        <span className="text-right">Pts</span>
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {player.roundHistory.map((round, rIdx) => {
          const isPerfect = round.bid === round.tricksWon;
          return (
            <div key={`${player.id}-round-${rIdx + 1}`} className="grid grid-cols-4 gap-1 text-sm px-1 py-0.5 rounded" style={{ background: isPerfect ? 'rgba(74, 222, 128, 0.1)' : 'transparent', color: isPerfect ? '#4ade80' : 'var(--accent-parchment)' }}>
              <span style={{ color: 'var(--accent-dim)' }}>{rIdx + 1}</span>
              <span className="text-center">{round.bid}</span>
              <span className="text-center">{round.tricksWon}</span>
              <span className={`text-right font-medium ${round.score < 0 ? 'text-red-400' : ''}`}>{round.score > 0 ? '+' : ''}{round.score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StandingsTab({ sortedPlayers, localPlayerId, stats }: StandingsTabProps) {
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {sortedPlayers.map((player, index) => {
        const playerStats = stats[player.id];
        const isExpanded = expandedPlayer === player.id;
        const isLocal = player.id === localPlayerId;
        const medal = getMedalDisplay(index);

        return (
          <div key={player.id}>
            <button
              onClick={() => setExpandedPlayer(isExpanded ? null : player.id)}
              className="w-full flex items-center justify-between gap-3 min-w-0 p-3 rounded-lg transition-all cursor-pointer"
              style={{
                background: isLocal
                  ? 'linear-gradient(90deg, color-mix(in srgb, var(--accent) 20%, transparent) 0%, color-mix(in srgb, var(--text-muted) 10%, transparent) 100%)'
                  : medal.bg,
                border: isLocal ? '2px solid color-mix(in srgb, var(--accent) 50%, transparent)' : '1px solid color-mix(in srgb, var(--text-muted) 30%, transparent)',
              }}
            >
              <div className={`${NAME_SCORE_LEFT_CLASS} gap-3`}>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: THEME_SURFACE.MODAL_BG,
                    border: `2px solid ${medal.color}`,
                    boxShadow: index === 0 ? `0 0 12px ${medal.color}40` : 'none',
                  }}
                >
                  <i className={`ra ${medal.icon} text-lg`} style={{ color: medal.color }} />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`font-semibold text-base ${NAME_SCORE_TEXT_FLEX_CLASS}`}
                      style={{
                        color: index === 0 ? 'var(--accent-bright)' : 'var(--color-amber-100)',
                        fontFamily: 'Georgia, serif',
                      }}
                    >
                      {player.name}
                    </span>
                    {isLocal ? <span
                        className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{ background: 'var(--accent)', color: '#1a1510' }}
                      >
                        You
                      </span> : null}
                  </div>
                  <div className="text-xs flex items-center gap-2 min-w-0" style={{ color: 'var(--text-muted)' }}>
                    <span>{playerStats?.perfectBids}/{playerStats?.totalBids} perfect</span>
                    <span>•</span>
                    <span>{playerStats?.totalTricksWon} tricks</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`font-bold text-2xl ${NAME_SCORE_VALUE_CLASS}`}
                  style={{
                    ...getNameScoreValueStyle(1, [player.score], 44),
                    color: index === 0 ? 'var(--accent-bright)' : 'var(--accent)',
                    fontFamily: 'Georgia, serif',
                  }}
                >
                  {player.score}
                </span>
                <i
                  className={`ra ${isExpanded ? 'ra-arrow-up' : 'ra-arrow-down'} text-sm flex-shrink-0`}
                  style={{
                    color: 'var(--accent-dim)',
                  }}
                />
              </div>
            </button>
            {!isLocal && !player.isBot ? (
              <div className="flex justify-end px-1 pt-1.5 empty:hidden">
                <SeatFriendAction gamePlayerId={player.id} />
              </div>
            ) : null}

            {isExpanded ? <RoundHistory player={player} /> : null}
          </div>
        );
      })}
    </div>
  );
}
