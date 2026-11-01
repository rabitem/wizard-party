'use client';

import { IPlayer } from '@shared/domain';

interface PlayerBidChipProps {
  player: IPlayer;
  isLocal: boolean;
  isCurrent: boolean;
  /** Slim padding for the compact bidding panel on landscape phones */
  compact?: boolean;
}

function getChipContainerClass(isLocalAndCurrent: boolean, isCurrent: boolean, hasBid: boolean): string {
  if (isLocalAndCurrent) return 'bg-amber-500/30 border-2 border-amber-400/60 scale-105';
  if (isCurrent) return 'bg-amber-500/20 border border-amber-400/40';
  if (hasBid) return 'bg-emerald-900/20 border border-emerald-700/30';
  return 'bg-black/20 border border-amber-800/20';
}

function getStatusClass(hasBid: boolean, isCurrent: boolean): string {
  if (hasBid) return 'bg-emerald-500';
  if (isCurrent) return 'bg-amber-400 animate-pulse';
  return 'bg-amber-800/40';
}

function getNameClass(isLocalAndCurrent: boolean, isLocal: boolean, isCurrent: boolean): string {
  if (isLocalAndCurrent) return 'text-amber-100 font-bold';
  if (isLocal) return 'text-amber-200 font-medium';
  if (isCurrent) return 'text-amber-200';
  return 'text-amber-100/70';
}

function getBidClass(hasBid: boolean, isCurrent: boolean): string {
  if (hasBid) return 'text-emerald-400';
  if (isCurrent) return 'text-amber-400/60';
  return 'text-amber-700/40';
}

function getBidDisplay(hasBid: boolean, isCurrent: boolean, bid: number | null): string | number {
  if (hasBid && bid !== null) return bid;
  if (isCurrent) return '?';
  return '-';
}

/**
 * Compact player bid chip for mobile - improved visibility
 */
export function PlayerBidChip({
  player,
  isLocal,
  isCurrent,
  compact = false,
}: PlayerBidChipProps) {
  const hasBid = player.bid !== null;
  const displayName = player.name.split(' ')[0].slice(0, 6);
  const isLocalAndCurrent = isLocal && isCurrent;

  return (
    <div className={`flex items-center gap-1.5 ${compact ? 'h-5 px-1.5' : 'px-2 py-1.5'} flex-shrink-0 transition-all ${getChipContainerClass(isLocalAndCurrent, isCurrent, hasBid)}`}>
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getStatusClass(hasBid, isCurrent)}`} />
      <span
        className={`font-serif text-xs ${getNameClass(isLocalAndCurrent, isLocal, isCurrent)}`}
      >
        {displayName}
      </span>
      <span className={`text-xs font-bold min-w-[14px] text-center ${getBidClass(hasBid, isCurrent)}`}>
        {getBidDisplay(hasBid, isCurrent, player.bid)}
      </span>
    </div>
  );
}
