'use client';

import { useCallback, useLayoutEffect } from 'react';
import { HUD_SLOT_ORDER } from '@/presentation/config/responsive.config';
import { useSheetState, BottomSheet } from '../ui';
import { HudPanelDecor } from '../hud/skins';
import { HudSlot } from '../hud/layout';
import type { BiddingUIWithBidProps } from './types';
import { getBidSummary } from './bid-rules';
import { BiddingFAB } from './BiddingFAB';
import { BidContextHeader } from './BidContextHeader';
import { BidSelector } from './BidSelector';
import { HandPreview } from './HandPreview';
import { PlaceBidButton } from './PlaceBidButton';

/** Sheet height in % of the visible viewport; the Place Bid footer stays visible regardless */
const SHEET_MAX_HEIGHT = { yourTurn: 80, waiting: 70 } as const;

function WaitingFor({ name }: { name: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-amber-300 text-sm font-serif">Waiting for</span>
      </div>
      <span className="text-lg font-bold text-amber-100 font-serif">{name}</span>
    </div>
  );
}

/**
 * Bidding on portrait phones: a bottom sheet that opens on every turn change. The trump, the
 * bid total and every player's bid are shown on your turn too (BidContextHeader), and Place Bid
 * sits in the sheet's sticky footer, so it is reachable without scrolling.
 */
export function BiddingSheet({
  players, localPlayerId, currentPlayerIndex, maxBid,
  trumpSuit, forbiddenBid, selectedBid, onBidChange, onPlaceBid, hand,
}: BiddingUIWithBidProps) {
  const currentPlayer = players[currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === localPlayerId;
  const { bidsPlaced } = getBidSummary(players);
  const { isOpen, open, close } = useSheetState('bidding');

  useLayoutEffect(() => {
    open();
  }, [open, isMyTurn]);

  const handlePlaceBid = useCallback((bid: number) => {
    onPlaceBid(bid);
    close();
  }, [onPlaceBid, close]);

  const footer = isMyTurn ? (
    <PlaceBidButton selectedBid={selectedBid} maxBid={maxBid} forbiddenBid={forbiddenBid} onPlaceBid={handlePlaceBid} fullWidth />
  ) : null;

  return (
    <>
      {isOpen ? null : (
        <HudSlot region="controls" order={HUD_SLOT_ORDER.controls.biddingButton}>
          <BiddingFAB isMyTurn={isMyTurn} bidsPlaced={bidsPlaced} totalPlayers={players.length} onExpand={open} />
        </HudSlot>
      )}

      <BottomSheet
        isOpen={isOpen}
        onClose={close}
        title={isMyTurn ? 'Your Turn to Bid' : 'Bidding Phase'}
        maxHeight={isMyTurn ? SHEET_MAX_HEIGHT.yourTurn : SHEET_MAX_HEIGHT.waiting}
        footer={footer}
      >
        <div className="relative isolate flex flex-col gap-3 px-4 py-3">
          <HudPanelDecor variant="picker" contained />
          {isMyTurn ? null : <WaitingFor name={currentPlayer?.name ?? ''} />}
          <BidContextHeader
            players={players}
            localPlayerId={localPlayerId}
            currentPlayerIndex={currentPlayerIndex}
            trumpSuit={trumpSuit}
            maxBid={maxBid}
            layout="stacked"
          />
          {isMyTurn ? (
            <BidSelector selectedBid={selectedBid} maxBid={maxBid} forbiddenBid={forbiddenBid} onBidChange={onBidChange} layout="stacked" />
          ) : null}
          {hand ? <HandPreview hand={hand} trumpSuit={trumpSuit} /> : null}
        </div>
      </BottomSheet>
    </>
  );
}
