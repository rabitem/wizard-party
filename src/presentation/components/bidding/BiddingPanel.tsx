'use client';

import { HUD_SLOT_ORDER } from '@/presentation/config/responsive.config';
import type { HudDensity } from '@/presentation/types/hud-layout.types';
import { NAME_SCORE_TEXT_CLASS } from '../name-score-layout';
import { HudPanelDecor, useHudClassName } from '../hud/skins';
import { HudSlot } from '../hud/layout';
import type { BiddingUIWithBidProps } from './types';
import { BidContextHeader } from './BidContextHeader';
import { BidSelector } from './BidSelector';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

/** Padding per density: the compact panel keeps a landscape phone's table and hand visible. */
const PANEL_CLASSES = {
  compact: { header: 'px-3 py-1.5', body: 'px-3 py-2' },
  regular: { header: 'px-4 py-2.5', body: 'px-4 py-3' },
} as const satisfies Record<HudDensity, Record<string, string>>;

/** 95% opaque surface: no backdrop-filter, which would re-blur the live canvas every frame. */
const PANEL_STYLE = {
  background: THEME_SURFACE.MODAL_BG,
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
} as const;

function WaitingLine({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 py-1 min-w-0">
      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
      <span className="text-amber-200/70 text-sm min-w-0" style={{ fontFamily: 'Georgia, serif' }}>
        Waiting for <span className={`text-amber-300 font-medium inline-block align-bottom max-w-[220px] ${NAME_SCORE_TEXT_CLASS}`}>{name}</span>
      </span>
    </div>
  );
}

/**
 * Bidding panel in the HUD prompt region (every layout except portrait phones). It shares the
 * region grid with the status bar and top-bar buttons, so it never covers them, and its
 * one-row selector keeps Place Bid on screen even on a 340px-tall landscape phone.
 */
export function BiddingPanel({
  players,
  localPlayerId,
  currentPlayerIndex,
  maxBid,
  trumpSuit,
  forbiddenBid,
  selectedBid,
  onBidChange,
  onPlaceBid,
  density,
}: BiddingUIWithBidProps) {
  const panelClass = useHudClassName('panel');
  const currentPlayer = players[currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === localPlayerId;
  const classes = PANEL_CLASSES[density];

  return (
    <HudSlot region="prompt" order={HUD_SLOT_ORDER.prompt.bidding}>
      <div className={`relative isolate min-w-0 max-w-full rounded-xl border border-amber-700/40 ${panelClass}`} style={PANEL_STYLE}>
        {/* Skin ornaments may overhang the edge, so clipping moved to the inner wrapper */}
        <HudPanelDecor variant="picker" />
        <div className="overflow-hidden rounded-[inherit]">
          <div className={`border-b border-amber-700/20 ${classes.header}`}>
            <BidContextHeader
              players={players}
              localPlayerId={localPlayerId}
              currentPlayerIndex={currentPlayerIndex}
              trumpSuit={trumpSuit}
              maxBid={maxBid}
              layout="inline"
              compact={density === 'compact'}
            />
          </div>
          <div className={classes.body}>
            {isMyTurn ? (
              <BidSelector
                selectedBid={selectedBid}
                maxBid={maxBid}
                forbiddenBid={forbiddenBid}
                onBidChange={onBidChange}
                onPlaceBid={onPlaceBid}
                layout="inline"
                compact={density === 'compact'}
              />
            ) : (
              <WaitingLine name={currentPlayer?.name ?? ''} />
            )}
          </div>
        </div>
      </div>
    </HudSlot>
  );
}
