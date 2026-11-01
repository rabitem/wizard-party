import type { IPlayer, Suit, ICard } from '@shared/domain';
import type { BiddingSurface, HudDensity } from '@/presentation/types/hud-layout.types';

export interface BiddingUIProps {
  players: IPlayer[];
  localPlayerId: string;
  currentPlayerIndex: number;
  maxBid: number;
  trumpSuit: Suit | null;
  forbiddenBid: number | null;
  onPlaceBid: (bid: number) => void;
  /** Bottom sheet (portrait phones) or a panel in the HUD prompt region (layout policy) */
  surface: BiddingSurface;
  /** Panel density: 'compact' on short landscape phones */
  density: HudDensity;
  hand?: ICard[];
}

export interface BiddingUIWithBidProps extends BiddingUIProps {
  selectedBid: number;
  onBidChange: (bid: number) => void;
}
