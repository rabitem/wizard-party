'use client';

import { IPlayer } from '@shared/domain';
import { Crown } from 'lucide-react';
import { ShieldIcon } from './ShieldIcon';
import {
  NAME_SCORE_TEXT_FLEX_CLASS,
  NAME_SCORE_VALUE_CLASS,
  getNameScoreValueStyle,
} from '../name-score-layout';

interface PlayerRankingCardProps {
  player: IPlayer;
  index: number;
  localPlayerId: string;
  isMobile?: boolean;
}

// Shield colors for rankings
const SHIELD_COLORS = ['#d4a84b', '#9ca3af', '#b45309', '#6b7280', '#6b7280', '#6b7280'];

function getRoundScore(player: IPlayer): number {
  if (player.bid !== null && player.tricksWon === player.bid) {
    return 20 + player.tricksWon * 10;
  }
  return -Math.abs(player.tricksWon - (player.bid ?? 0)) * 10;
}

function getRankingCardClass(isLocal: boolean): string {
  if (isLocal) return 'bg-amber-900/20 border border-amber-600/30';
  return 'bg-black/20 border border-amber-900/20';
}

function getScoreBadgeClass(madeIt: boolean): string {
  if (madeIt) return 'bg-emerald-900/30 text-emerald-400';
  return 'bg-red-900/30 text-red-400';
}

function getScoreBadgeFullClass(madeIt: boolean): string {
  if (madeIt) return 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/30';
  return 'bg-red-900/30 text-red-400 border border-red-700/30';
}

export function PlayerRankingCard({ player, index, localPlayerId, isMobile = false }: PlayerRankingCardProps) {
  const roundScore = getRoundScore(player);
  const madeIt = player.bid !== null && player.tricksWon === player.bid;
  const isLocal = player.id === localPlayerId;
  const shieldColor = SHIELD_COLORS[index] || '#6b7280';

  if (isMobile) {
    // Super compact mobile layout
    return (
      <div
        className={`relative flex items-center gap-2 px-2 py-1 rounded transition-all ${getRankingCardClass(isLocal)}`}
      >
        {/* Rank number instead of shield */}
        <div
          className="w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full flex-shrink-0"
          style={{
            backgroundColor: `${shieldColor}20`,
            color: shieldColor,
            border: `1px solid ${shieldColor}50`
          }}
        >
          {index + 1}
        </div>

        {/* Player name */}
        <div className="flex-1 min-w-0">
          <span
            className={`text-xs font-medium truncate block ${isLocal ? 'text-amber-200' : 'text-amber-100/70'}`}
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {player.name}{isLocal ? ' (You)' : ''}
          </span>
        </div>

        {/* Bid info compact */}
        <div className="text-[10px] text-amber-200/40 flex-shrink-0">
          {player.bid}→{player.tricksWon}
        </div>

        {/* Score badge */}
        <div
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${getScoreBadgeClass(madeIt)}`}
        >
          {roundScore > 0 ? '+' : ''}{roundScore}
        </div>

        {/* Total score */}
        <div
          className="text-sm font-bold text-amber-100 min-w-[28px] text-right"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {player.score}
        </div>
      </div>
    );
  }

  // Desktop layout (unchanged)
  return (
    <div
      className={`relative flex items-center gap-3 p-2 rounded-lg transition-all ${getRankingCardClass(isLocal)} ${index === 0 ? 'scale-[1.02]' : ''}`}
    >
      {/* Shield with rank */}
      <div className="flex-shrink-0">
        <ShieldIcon place={index + 1} color={shieldColor} size={index === 0 ? 44 : 36} />
      </div>

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`font-medium ${NAME_SCORE_TEXT_FLEX_CLASS} ${index === 0 ? 'text-amber-300' : 'text-amber-100/80'}`}
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {player.name}
          </span>
          {isLocal ? <span className="text-[10px] text-amber-500/60 italic flex-shrink-0">(You)</span> : null}
        </div>
        <div className="text-xs text-amber-200/40">
          Bid {player.bid} &rarr; Won {player.tricksWon}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div
          className={`px-2 py-0.5 rounded text-xs font-bold ${getScoreBadgeFullClass(madeIt)}`}
        >
          {roundScore > 0 ? '+' : ''}{roundScore}
        </div>
        <div
          className={NAME_SCORE_VALUE_CLASS}
          style={getNameScoreValueStyle(1, [player.score], 40)}
        >
          <div
            className={`font-bold ${index === 0 ? 'text-amber-400 text-lg' : 'text-amber-100'}`}
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {player.score}
          </div>
        </div>
      </div>

      {/* Winner crown decoration */}
      {index === 0 && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
          <Crown className="w-4 h-4 text-amber-500" />
        </div>
      )}
    </div>
  );
}
