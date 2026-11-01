import { IPlayer } from '@shared/domain';
import type { LeaderboardPosition, StandingsMode } from '@/presentation/types/hud-layout.types';

export type { LeaderboardPosition };

/**
 * Sorted player entry with calculated fields for display
 */
export interface LeaderboardEntry {
  player: IPlayer;
  position: number;
  originalIndex: number;
  roundScore: number;
  madeCurrentBid: boolean;
  bidProgress: string;
}

export interface InGameLeaderboardProps {
  players: IPlayer[];
  localPlayerId: string;
  currentRound: number;
  currentPlayerIndex: number;
  isOpen: boolean;
  onClose: () => void;
  /** Sheet (phone HUD), docked beside the table, or a popover from the top bar */
  mode: StandingsMode;
  position?: LeaderboardPosition;
  compact?: boolean;
}
