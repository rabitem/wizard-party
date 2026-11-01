'use client';

import { useState } from 'react';
import type { BiddingUIProps } from './types';
import { resolveSelectableBid } from './bid-rules';
import { BiddingPanel } from './BiddingPanel';
import { BiddingSheet } from './BiddingSheet';

/**
 * Bidding phase UI. The layout policy picks the surface (sheet on portrait phones, panel in the
 * HUD prompt region elsewhere); both show the same bid context and the same BidSelector.
 */
export function BiddingUI(props: BiddingUIProps) {
  const { forbiddenBid, maxBid, surface } = props;
  const [pickedBid, setPickedBid] = useState(0);
  // The forbidden bid appears only once the last bidder is up, so derive the shown selection
  // every render instead of validating the pick once on mount.
  const selectedBid = resolveSelectableBid(pickedBid, { maxBid, forbiddenBid });

  if (surface === 'sheet') {
    return <BiddingSheet {...props} selectedBid={selectedBid} onBidChange={setPickedBid} />;
  }
  return <BiddingPanel {...props} selectedBid={selectedBid} onBidChange={setPickedBid} />;
}
