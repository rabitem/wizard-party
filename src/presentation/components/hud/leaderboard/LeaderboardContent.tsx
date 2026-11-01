'use client';

import { LeaderboardEntry } from './types';
import { LeaderboardRow } from './LeaderboardRow';
import {
  COMPACT_LEADERBOARD_NAME_GROUP_CLASS,
  COMPACT_LEADERBOARD_NAME_TEXT_CLASS,
  COMPACT_LEADERBOARD_SCORE_CLASS,
  LEADERBOARD_VERTICAL_CONTENT_CLASS,
  getCompactLeaderboardScoreStyle,
} from './leaderboard-layout';

function getCompactBorderClass(isCurrentTurn: boolean, isLocal: boolean): string {
  if (isCurrentTurn) return 'border-emerald-600/40 bg-emerald-900/20';
  if (isLocal) return 'border-amber-600/40 bg-amber-900/20';
  return 'border-amber-800/30 bg-black/20';
}

function getCompactTextClass(isCurrentTurn: boolean, isLocal: boolean): string {
  if (isCurrentTurn) return 'text-emerald-300';
  if (isLocal) return 'text-amber-200';
  return 'text-amber-100/70';
}

/**
 * Leaderboard content for desktop (list view)
 */
export function LeaderboardContent({
  entries,
  localPlayerId,
  currentPlayerIndex,
  horizontal = false,
  scale = 1,
}: {
  entries: LeaderboardEntry[];
  localPlayerId: string;
  currentPlayerIndex: number;
  currentRound?: number;
  horizontal?: boolean;
  scale?: number;
}) {
  if (horizontal) {
    return (
      <div className="p-1.5 flex items-center gap-1.5">
        {entries.map((entry) => (
          <LeaderboardRow
            key={entry.player.id}
            entry={entry}
            isLocal={entry.player.id === localPlayerId}
            isCurrentTurn={entry.originalIndex === currentPlayerIndex}
            compact
            scale={scale}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={LEADERBOARD_VERTICAL_CONTENT_CLASS}>
      {entries.map((entry) => (
        <LeaderboardRow
          key={entry.player.id}
          entry={entry}
          isLocal={entry.player.id === localPlayerId}
          isCurrentTurn={entry.originalIndex === currentPlayerIndex}
          scale={scale}
        />
      ))}
    </div>
  );
}

/**
 * Compact leaderboard content (names + scores only)
 */
export function CompactLeaderboardContent({
  entries,
  localPlayerId,
  currentPlayerIndex,
  horizontal = false,
  scale = 1,
}: {
  entries: LeaderboardEntry[];
  localPlayerId: string;
  currentPlayerIndex: number;
  horizontal?: boolean;
  scale?: number;
}) {
  if (horizontal) {
    return (
      <div className="p-1.5 flex items-center gap-1.5">
        {entries.map((entry) => {
          const isLocal = entry.player.id === localPlayerId;
          const isCurrentTurn = entry.originalIndex === currentPlayerIndex;
          return (
            <div
              key={entry.player.id}
              className={`flex items-center gap-1.5 px-1.5 py-1 border flex-shrink-0 min-w-0 ${getCompactBorderClass(isCurrentTurn, isLocal)}`}
            >
              <span
                className="font-bold"
                style={{ color: entry.position <= 3 ? 'var(--accent)' : 'var(--text-muted)', fontSize: `${10 * scale}px` }}
              >
                #{entry.position}
              </span>
              <span
                className={`${COMPACT_LEADERBOARD_NAME_TEXT_CLASS} ${getCompactTextClass(isCurrentTurn, isLocal)}`}
                style={{ fontFamily: 'var(--font-serif)', fontSize: `${10 * scale}px`, maxWidth: `${50 * scale}px` }}
              >
                {entry.player.name.split(' ')[0]}
              </span>
              <span
                className={COMPACT_LEADERBOARD_SCORE_CLASS}
                style={{
                  ...getCompactLeaderboardScoreStyle(scale, [entry.player.score]),
                  color: isLocal ? 'var(--accent-bright)' : 'var(--accent)',
                  fontFamily: 'var(--font-serif)',
                  fontSize: `${12 * scale}px`,
                }}
              >
                {entry.player.score}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={LEADERBOARD_VERTICAL_CONTENT_CLASS}>
      {entries.map((entry) => {
        const isLocal = entry.player.id === localPlayerId;
        const isCurrentTurn = entry.originalIndex === currentPlayerIndex;
        return (
          <div
            key={entry.player.id}
            className={`flex items-center justify-between px-1.5 py-1 border ${getCompactBorderClass(isCurrentTurn, isLocal)}`}
          >
            <div className={COMPACT_LEADERBOARD_NAME_GROUP_CLASS}>
              <span
                className="font-bold flex-shrink-0"
                style={{ color: entry.position <= 3 ? 'var(--accent)' : 'var(--text-muted)', fontSize: `${10 * scale}px`, width: `${16 * scale}px` }}
              >
                #{entry.position}
              </span>
              <span
                className={`${COMPACT_LEADERBOARD_NAME_TEXT_CLASS} ${getCompactTextClass(isCurrentTurn, isLocal)}`}
                style={{ fontFamily: 'var(--font-serif)', fontSize: `${10 * scale}px` }}
              >
                {entry.player.name}
              </span>
            </div>
            <span
              className={`${COMPACT_LEADERBOARD_SCORE_CLASS} ml-1`}
              style={{
                ...getCompactLeaderboardScoreStyle(scale, [entry.player.score]),
                color: isLocal ? 'var(--accent-bright)' : 'var(--accent)',
                fontFamily: 'var(--font-serif)',
                fontSize: `${12 * scale}px`,
              }}
            >
              {entry.player.score}
            </span>
          </div>
        );
      })}
    </div>
  );
}
