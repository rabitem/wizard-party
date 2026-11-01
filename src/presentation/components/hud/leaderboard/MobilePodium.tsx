'use client';

import { LeaderboardEntry } from './types';
import { getPlayerAvatarIcon } from './utils';
import { useAvatarId } from '../../account/PlayerAvatar';
import { NAME_SCORE_TEXT_CLASS, NAME_SCORE_VALUE_CLASS } from '../../name-score-layout';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

function getPodiumHeightClass(height: 'tall' | 'medium' | 'short'): string {
  if (height === 'tall') return 'h-24';
  if (height === 'medium') return 'h-18';
  return 'h-14';
}

function getPodiumNameColor(isCurrentTurn: boolean, isLocal: boolean): string {
  if (isCurrentTurn) return '#4ade80';
  if (isLocal) return '#f0c674';
  return '#c9b896';
}

function getRunnerUpBackground(isCurrentTurn: boolean, isLocal: boolean): string {
  if (isCurrentTurn) return 'rgba(74, 222, 128, 0.1)';
  if (isLocal) return 'color-mix(in srgb, var(--accent) 10%, transparent)';
  return 'color-mix(in srgb, var(--surface) 80%, transparent)';
}

function getRunnerUpBorderColor(isCurrentTurn: boolean, isLocal: boolean): string {
  if (isCurrentTurn) return 'rgba(74, 222, 128, 0.4)';
  if (isLocal) return 'rgba(212, 168, 83, 0.4)';
  return 'rgba(139, 115, 85, 0.3)';
}

function getPodiumRoundScoreColor(madeCurrentBid: boolean, roundScore: number, fallbackColor: string): string {
  if (madeCurrentBid) return '#4ade80';
  if (roundScore < 0) return '#f87171';
  return fallbackColor;
}

type PodiumColors = { bg: string; border: string; accent: string; text: string };

/** Medieval framed avatar with corner accents */
function PodiumAvatar({ avatarIcon, isCurrentTurn, isLocal, color }: { avatarIcon: string; isCurrentTurn: boolean; isLocal: boolean; color: PodiumColors }) {
  return (
    <div className="relative mb-2">
      <div
        className="w-12 h-12 flex items-center justify-center relative"
        style={{ background: THEME_SURFACE.MODAL_BG }}
      >
        <div className="absolute inset-0 border-2" style={{ borderColor: isCurrentTurn ? '#4ade80' : color.border, boxShadow: isCurrentTurn ? '0 0 12px rgba(74, 222, 128, 0.4)' : undefined }} />
        <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l" style={{ borderColor: color.accent }} />
        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t border-r" style={{ borderColor: color.accent }} />
        <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b border-l" style={{ borderColor: color.accent }} />
        <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r" style={{ borderColor: color.accent }} />
        <i className={`ra ${avatarIcon} text-xl leading-none relative`} style={{ color: color.text }} />
      </div>
      {isLocal ? (
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[7px] font-bold uppercase"
          style={{ background: 'linear-gradient(180deg, var(--accent-pale) 0%, var(--accent) 100%)', color: '#1a1510', fontFamily: 'Georgia, serif' }}
        >
          You
        </div>
      ) : null}
    </div>
  );
}

/** Podium block with position, score, and round score */
function PodiumBlock({ entry, heightClass, color }: { entry: LeaderboardEntry; heightClass: string; color: PodiumColors }) {
  return (
    <div className={`w-18 ${heightClass} flex flex-col items-center justify-start pt-2 relative`} style={{ background: color.bg }}>
      <div className="absolute inset-0 border-2" style={{ borderColor: color.border }} />
      <div className="absolute top-0 left-2 right-2 h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${color.accent}, transparent)` }} />
      <span className="text-xl font-bold relative" style={{ color: color.text, fontFamily: 'Georgia, serif' }}>{entry.position}</span>
      <span className="text-sm font-bold relative" style={{ color: color.text }}>{entry.player.score}</span>
      {entry.player.bid !== null && (
        <span className="text-[10px] relative mt-0.5" style={{ color: getPodiumRoundScoreColor(entry.madeCurrentBid, entry.roundScore, color.text) }}>
          {entry.roundScore > 0 ? '+' : ''}{entry.roundScore}
        </span>
      )}
    </div>
  );
}

/**
 * Podium place component for mobile - Medieval styled
 */
const PODIUM_COLORS: Record<number, PodiumColors> = {
  1: { bg: 'rgba(240,198,116,0.2)', border: 'var(--accent-pale)', accent: '#ffd700', text: '#f0c674' },
  2: { bg: 'rgba(192,192,192,0.15)', border: '#a0a0a0', accent: '#c0c0c0', text: '#c0c0c0' },
  3: { bg: 'rgba(205,127,50,0.15)', border: '#cd7f32', accent: '#daa06d', text: '#cd7f32' },
};
const DEFAULT_PODIUM_COLOR: PodiumColors = { bg: 'rgba(61,48,32,0.3)', border: '#5a4a30', accent: '#8b7355', text: '#c9b896' };

export function PodiumPlace({
  entry,
  isLocal,
  isCurrentTurn,
  height,
}: {
  entry: LeaderboardEntry;
  isLocal: boolean;
  isCurrentTurn: boolean;
  height: 'tall' | 'medium' | 'short';
}) {
  const localAvatarId = useAvatarId();
  const avatarIcon = getPlayerAvatarIcon(isLocal, entry.originalIndex, localAvatarId);
  const heightClass = getPodiumHeightClass(height);
  const color = PODIUM_COLORS[entry.position] || DEFAULT_PODIUM_COLOR;

  return (
    <div className="flex flex-col items-center">
      <PodiumAvatar avatarIcon={avatarIcon} isCurrentTurn={isCurrentTurn} isLocal={isLocal} color={color} />
      <span
        className={`text-[11px] font-medium text-center mb-1 max-w-[70px] block ${NAME_SCORE_TEXT_CLASS}`}
        style={{ color: getPodiumNameColor(isCurrentTurn, isLocal), fontFamily: 'Georgia, serif' }}
        title={entry.player.name}
      >
        {entry.player.name.split(' ')[0]}
      </span>
      <PodiumBlock entry={entry} heightClass={heightClass} color={color} />
    </div>
  );
}

/**
 * Compact player chip for runners-up (positions 4+) - Medieval styled
 */
export function RunnerUpChip({
  entry,
  isLocal,
  isCurrentTurn,
}: {
  entry: LeaderboardEntry;
  isLocal: boolean;
  isCurrentTurn: boolean;
}) {
  const localAvatarId = useAvatarId();
  const avatarIcon = getPlayerAvatarIcon(isLocal, entry.originalIndex, localAvatarId);

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1.5 flex-shrink-0 min-w-0 max-w-[130px] relative"
      style={{
        background: getRunnerUpBackground(isCurrentTurn, isLocal),
      }}
    >
      {/* Border frame */}
      <div
        className="absolute inset-0 border"
        style={{
          borderColor: getRunnerUpBorderColor(isCurrentTurn, isLocal),
        }}
      />
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-amber-600/40" />
      <div className="absolute top-0 right-0 w-1 h-1 border-t border-r border-amber-600/40" />
      <div className="absolute bottom-0 left-0 w-1 h-1 border-b border-l border-amber-600/40" />
      <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-amber-600/40" />

      {/* Position */}
      <span className="text-[10px] font-bold text-amber-600 relative">{entry.position}</span>
      {/* Avatar */}
      <i className={`ra ${avatarIcon} text-xs leading-none text-amber-400 relative flex-shrink-0`} />
      {/* Name */}
      <span
        className={`text-[10px] relative max-w-[50px] ${NAME_SCORE_TEXT_CLASS}`}
        style={{
          color: isLocal ? 'var(--accent-pale)' : 'var(--accent-parchment)',
          fontFamily: 'Georgia, serif',
        }}
        title={entry.player.name}
      >
        {entry.player.name.split(' ')[0]}
      </span>
      {/* Score */}
      <span className={`text-[10px] font-bold text-amber-300 relative ${NAME_SCORE_VALUE_CLASS}`}>{entry.player.score}</span>
    </div>
  );
}

/**
 * Mobile podium content (used inside BottomSheet) - Medieval styled
 */
export function MobilePodiumContent({
  entries,
  localPlayerId,
  currentPlayerIndex,
  currentRound,
}: {
  entries: LeaderboardEntry[];
  localPlayerId: string;
  currentPlayerIndex: number;
  currentRound: number;
}) {
  const top3 = entries.slice(0, 3);
  const runnersUp = entries.slice(3);

  // Reorder for podium: 2nd, 1st, 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumHeights: ('medium' | 'tall' | 'short')[] = ['medium', 'tall', 'short'];

  return (
    <div className="px-4 pb-6 pt-2">
      {/* Round indicator - Medieval divider */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/40" />
        <div className="flex items-center gap-2">
          <span className="text-amber-700/50 text-xs">&#x2726;</span>
          <span
            className="text-xs text-amber-400 uppercase tracking-wider"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Round {currentRound}
          </span>
          <span className="text-amber-700/50 text-xs">&#x2726;</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/40" />
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-3 mb-4">
        {podiumOrder.map((entry, idx) => entry && (
          <PodiumPlace
            key={entry.player.id}
            entry={entry}
            isLocal={entry.player.id === localPlayerId}
            isCurrentTurn={entry.originalIndex === currentPlayerIndex}
            height={podiumHeights[idx]}
          />
        ))}
      </div>

      {/* Runners-up */}
      {runnersUp.length > 0 && (
        <>
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-px w-8 bg-amber-700/30" />
            <span className="text-[10px] text-amber-600/60 uppercase tracking-wide">Also Playing</span>
            <div className="h-px w-8 bg-amber-700/30" />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none justify-center">
            {runnersUp.map((entry) => (
              <RunnerUpChip
                key={entry.player.id}
                entry={entry}
                isLocal={entry.player.id === localPlayerId}
                isCurrentTurn={entry.originalIndex === currentPlayerIndex}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
