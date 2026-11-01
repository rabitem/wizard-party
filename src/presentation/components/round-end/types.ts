import { IPlayer } from '@shared/domain';

export interface RoundEndUIProps {
  players: IPlayer[];
  currentRound: number;
  maxRounds: number;
  localPlayerId: string;
  hostId: string;
  onNextRound: () => void;
  // Mobile controls
  isConnected?: boolean;
  onSendEmote?: (emoteId: string) => void;
  onSendChat?: (message: string) => void;
  isMobile?: boolean;
}
