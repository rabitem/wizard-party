'use client';

import { LeaderboardEntry } from './types';
import { getPlayerAvatarIcon } from './utils';
import { PositionBadge } from './PositionBadge';
import { PlayerConnectionDot } from '../../PlayerConnectionDot';
import { SeatFriendAction } from '../../friends';
import {
  COMPACT_LEADERBOARD_NAME_TEXT_CLASS,
  COMPACT_LEADERBOARD_SCORE_CLASS,
  LEADERBOARD_NAME_CELL_CLASS,
  LEADERBOARD_NAME_ROW_CLASS,
  LEADERBOARD_NAME_TEXT_CLASS,
  LEADERBOARD_SCORE_COLUMN_CLASS,
  LEADERBOARD_TRICKS_LABEL_CLASS,
  LEADERBOARD_TRICKS_ROW_CLASS,
  LEADERBOARD_TRICKS_VALUE_CLASS,
  getCompactLeaderboardScoreStyle,
  getLeaderboardScoreColumnStyle,
} from './leaderboard-layout';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

function getRowBorderClass(isCurrentTurn: boolean, isLocal: boolean): string {
  if (isCurrentTurn) return 'border-emerald-600/40 bg-emerald-900/20';
  if (isLocal) return 'border-amber-600/40 bg-amber-900/20';
  return 'border-amber-800/30 bg-black/20';
}

function getRowTextClass(isCurrentTurn: boolean, isLocal: boolean): string {
  if (isCurrentTurn) return 'text-emerald-300';
  if (isLocal) return 'text-amber-200';
  return 'text-amber-100/70';
}

function getNameColor(isCurrentTurn: boolean, isLocal: boolean): string {
  if (isCurrentTurn) return '#4ade80';
  if (isLocal) return '#ffd700';
  return '#fef3c7';
}

function getTricksColor(madeCurrentBid: boolean, tricksWon: number, bid: number): string {
  if (madeCurrentBid) return '#4ade80';
  if (tricksWon < bid) return '#c9b896';
  return '#f87171';
}

function getRoundScoreColor(madeCurrentBid: boolean, roundScore: number): string {
  if (madeCurrentBid) return '#4ade80';
  if (roundScore < 0) return '#f87171';
  return '#a89060';
}

/** Compact row for horizontal layout */
function CompactRow({ entry, isLocal, isCurrentTurn, scale }: { entry: LeaderboardEntry; isLocal: boolean; isCurrentTurn: boolean; scale: number }) {
  return (
    <div className={`flex items-center gap-1.5 px-1.5 py-1 border flex-shrink-0 min-w-0 ${getRowBorderClass(isCurrentTurn, isLocal)}`}>
      <PositionBadge position={entry.position} size="sm" scale={scale} />
      <span
        className={`${COMPACT_LEADERBOARD_NAME_TEXT_CLASS} ${getRowTextClass(isCurrentTurn, isLocal)}`}
        style={{ fontFamily: 'Georgia, serif', fontSize: `${10 * scale}px`, maxWidth: `${50 * scale}px` }}
      >
        {entry.player.name.split(' ')[0]}
      </span>
      <span
        className={COMPACT_LEADERBOARD_SCORE_CLASS}
        style={{
          ...getCompactLeaderboardScoreStyle(scale, [entry.player.score]),
          color: isLocal ? 'var(--accent-bright)' : 'var(--accent)',
          fontFamily: 'Georgia, serif',
          fontSize: `${12 * scale}px`,
        }}
      >
        {entry.player.score}
      </span>
    </div>
  );
}

/** Player avatar with connection indicator */
function PlayerAvatar({ entry, isLocal, avatarSize }: { entry: LeaderboardEntry; isLocal: boolean; avatarSize: number }) {
  const avatarIcon = getPlayerAvatarIcon(isLocal, entry.originalIndex);
  return (
    <div className="relative flex-shrink-0">
      <div className="flex items-center justify-center border border-amber-800/40" style={{ width: avatarSize, height: avatarSize, background: THEME_SURFACE.CONTROL_BG }}>
        <i className={`ra ${avatarIcon} leading-none`} style={{ color: entry.position === 1 ? 'var(--accent-bright)' : 'var(--accent)', fontSize: `${avatarSize * 0.5}px` }} />
      </div>
      {!entry.player.isBot && <div className="absolute -bottom-0.5 -right-0.5"><PlayerConnectionDot isConnected={entry.player.isConnected} isBot={entry.player.isBot} size="sm" /></div>}
    </div>
  );
}

/**
 * Leaderboard entry row displaying a single player's stats
 */
export function LeaderboardRow({ entry, isLocal, isCurrentTurn, compact = false, scale = 1 }: { entry: LeaderboardEntry; isLocal: boolean; isCurrentTurn: boolean; compact?: boolean; scale?: number }) {
  if (compact) return <CompactRow entry={entry} isLocal={isLocal} isCurrentTurn={isCurrentTurn} scale={scale} />;

  const avatarSize = Math.round(28 * scale);
  const scoreValues = entry.player.bid !== null
    ? [entry.player.score, entry.roundScore]
    : [entry.player.score];

  return (
    <div className={`flex items-center min-w-0 px-2 py-1.5 border ${getRowBorderClass(isCurrentTurn, isLocal)}`} style={{ gap: `${8 * scale}px` }}>
      <PositionBadge position={entry.position} size="md" scale={scale} />
      <PlayerAvatar entry={entry} isLocal={isLocal} avatarSize={avatarSize} />

      {/* Name and progress */}
      <div className={LEADERBOARD_NAME_CELL_CLASS}>
        <div className={LEADERBOARD_NAME_ROW_CLASS} style={{ gap: `${4 * scale}px` }}>
          <span
            className={LEADERBOARD_NAME_TEXT_CLASS}
            style={{
              color: getNameColor(isCurrentTurn, isLocal),
              fontFamily: 'Georgia, serif',
              fontSize: `${13 * scale}px`,
            }}
          >
            {entry.player.name}
          </span>
          {!isLocal && !compact && !entry.player.isBot ? <SeatFriendAction gamePlayerId={entry.player.id} size="icon" /> : null}
          {isLocal ? (
            <span
              className="uppercase font-bold flex-shrink-0 leading-none"
              style={{
                color: '#1a1510',
                background: 'var(--accent-bright)',
                fontSize: `${9 * scale}px`,
                padding: `${2 * scale}px ${3 * scale}px`,
              }}
            >
              you
            </span>
          ) : null}
          {entry.player.isBot ? (
            <i
              className="ra ra-robot-arm leading-none flex-shrink-0 text-amber-700/50"
              style={{ fontSize: `${11 * scale}px` }}
            />
          ) : null}
        </div>
        {entry.player.bid !== null && (
          <div className={LEADERBOARD_TRICKS_ROW_CLASS} style={{ gap: `${3 * scale}px` }}>
            <span style={{ fontSize: `${11 * scale}px` }} className={`${LEADERBOARD_TRICKS_LABEL_CLASS} text-amber-600/50`}>Tricks:</span>
            <span
              className={LEADERBOARD_TRICKS_VALUE_CLASS}
              style={{
                fontSize: `${12 * scale}px`,
                color: getTricksColor(entry.madeCurrentBid, entry.player.tricksWon, entry.player.bid ?? 0),
              }}
            >
              {entry.bidProgress}
            </span>
          </div>
        )}
      </div>

      {/* Score */}
      <div
        className={LEADERBOARD_SCORE_COLUMN_CLASS}
        style={getLeaderboardScoreColumnStyle(scale, scoreValues)}
      >
        {entry.player.bid !== null && (
          <div
            className="font-medium"
            style={{
              fontSize: `${11 * scale}px`,
              color: getRoundScoreColor(entry.madeCurrentBid, entry.roundScore),
            }}
          >
            {entry.roundScore > 0 ? '+' : ''}{entry.roundScore}
          </div>
        )}
        <div
          className="font-bold"
          style={{ color: isLocal ? 'var(--accent-bright)' : 'var(--accent)', fontFamily: 'Georgia, serif', fontSize: `${16 * scale}px` }}
        >
          {entry.player.score}
        </div>
      </div>
    </div>
  );
}
