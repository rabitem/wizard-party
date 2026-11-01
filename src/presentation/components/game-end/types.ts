import { IPlayer } from '@shared/domain';
import type { TournamentMatchRoomState } from '@shared/domain/tournament';

export type TabId = 'standings' | 'recap' | 'stats';

export interface GameEndUIProps {
  players: IPlayer[];
  localPlayerId: string;
  maxRounds: number;
  onPlayAgain: () => void;
  onReturnToLobby?: () => void;
  /** Set for tournament matches: no rematch or casual lobby, only the way back to the tournament. */
  tournament?: {
    match: Pick<TournamentMatchRoomState, 'label' | 'reported' | 'reportOutcome'>;
    onBackToTournament: () => void;
  } | null;
}

export interface PlayerStats {
  perfectBids: number;
  totalBids: number;
  bestRound: number;
  worstRound: number;
  totalTricksWon: number;
  longestStreak: number;
}

export interface ScoreProgressionData {
  playerId: string;
  playerName: string;
  scores: number[];
}

export interface MedalDisplay {
  icon: string;
  color: string;
  bg: string;
}

export const PLAYER_COLORS = ['#ffd700', '#4a9eff', '#4ade80', '#f87171', '#a78bfa', '#f472b6'];
