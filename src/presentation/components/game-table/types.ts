import { ITrick, IPlayer, Suit, GamePhase, ICard } from '@shared/domain';
import type { PendingCardPlay, ServerPhysicsState } from '../three';
import type { CollectionAnimationMode } from '../../config/collection-animation.config';

export interface GameTableProps {
  currentTrick: ITrick | null;
  players: IPlayer[];
  localPlayerId: string;
  trumpSuit: Suit | null;
  currentPlayerIndex: number;
  dealerIndex: number;
  trickWinnerId?: string | null;
  onCardLand?: (card: ICard) => void;
  onTrickCollectComplete?: () => void;
  onAllCardsLanded?: () => void;
  gamePhase?: GamePhase;
  pendingDropInfo?: PendingCardPlay | null;
  isWaitingForCardsToLand?: boolean;
  /** Get physics state for a card from server broadcast - enables synchronized multiplayer animations */
  getCardPhysicsState?: (cardId: string) => ServerPhysicsState | null;
  shouldShowPlayedCard?: (cardId: string) => boolean;
  shouldAnimatePlayedCard?: (cardId: string) => boolean;
  onPlayedCardAnimationComplete?: (cardId: string) => void;
  collectionAnimationMode?: CollectionAnimationMode;
}

export interface PlayerPosition {
  cardPos: [number, number, number];
  seatPos: [number, number, number];
  startPos: [number, number, number];
  handPos: [number, number, number];
  rotation: number;
}

export interface FrozenCollectingCards {
  winnerId: string;
  cards: { playerId: string; card: ICard }[];
}
