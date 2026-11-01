'use client';

import type { IPlayer, Suit } from '@shared/domain';
import { useCurrentCardTheme } from '@/presentation/hooks/useCardTheme';
import { getHudSuitColor } from '../hud/hud-suit-color';
import { getBidSummary } from './bid-rules';
import { PlayerBidChip } from './PlayerBidChip';

/** 'inline': one row with scrolling chips (panel); 'stacked': summary row above wrapped chips (sheet). */
export type BidContextLayout = 'inline' | 'stacked';

interface BidContextHeaderProps {
  players: IPlayer[];
  localPlayerId: string;
  currentPlayerIndex: number;
  trumpSuit: Suit | null;
  /** Tricks this round (= cards in hand), the reference for the bid total */
  maxBid: number;
  layout: BidContextLayout;
  /** Hide labels and the trump name (short viewports) */
  compact?: boolean;
}

const LABEL_CLASS = 'text-[10px] text-amber-500/60 uppercase tracking-wider';

function TrumpSummary({ trumpSuit, compact }: { trumpSuit: Suit | null; compact: boolean }) {
  const cardTheme = useCurrentCardTheme();
  const suit = trumpSuit ? cardTheme.suits[trumpSuit] : null;
  return (
    <div className="flex flex-shrink-0 items-center gap-1.5" title={suit ? `Trump: ${suit.name}` : 'No trump'}>
      {compact ? null : <span className={LABEL_CLASS}>Trump</span>}
      {suit ? (
        <span className="flex items-center gap-1" style={{ color: getHudSuitColor(suit.accent) }}>
          <i className={`ra ${suit.symbol} text-base leading-none`} />
          {compact ? null : <span className="text-sm leading-none" style={{ fontFamily: 'Georgia, serif' }}>{suit.name}</span>}
        </span>
      ) : (
        <span className="flex items-center gap-1 text-amber-500/70">
          <i className="ra ra-cancel text-base leading-none" />
          {compact ? null : <span className="text-sm leading-none" style={{ fontFamily: 'Georgia, serif' }}>None</span>}
        </span>
      )}
    </div>
  );
}

function TotalSummary({ totalBids, maxBid, compact }: { totalBids: number; maxBid: number; compact: boolean }) {
  return (
    <div className="flex flex-shrink-0 items-center gap-1.5" title="Bids placed / tricks this round">
      <span className={LABEL_CLASS}>{compact ? 'Bids' : 'Total'}</span>
      <span className={`text-sm font-bold ${totalBids > maxBid ? 'text-red-400' : 'text-amber-200'}`}>
        {totalBids}/{maxBid}
      </span>
    </div>
  );
}

function PlayerChips({ players, localPlayerId, currentPlayerIndex, wrap }: Pick<BidContextHeaderProps, 'players' | 'localPlayerId' | 'currentPlayerIndex'> & { wrap: boolean }) {
  const chips = players.map((player, index) => (
    <PlayerBidChip key={player.id} player={player} isLocal={player.id === localPlayerId} isCurrent={index === currentPlayerIndex} />
  ));
  if (wrap) return <div className="flex flex-wrap justify-center gap-1.5">{chips}</div>;
  return (
    <div className="hud-scroll-row min-w-0 flex-1 overflow-x-auto overscroll-x-contain">
      <div className="flex w-max gap-1.5">{chips}</div>
    </div>
  );
}

const Divider = () => <div className="h-4 w-px flex-shrink-0 bg-amber-700/30" />;

/**
 * What a player needs to decide a bid, identical on every bidding surface: the trump, the bid
 * total against this round's tricks, and every player's bid so far.
 */
export function BidContextHeader({ players, localPlayerId, currentPlayerIndex, trumpSuit, maxBid, layout, compact = false }: BidContextHeaderProps) {
  const { totalBids } = getBidSummary(players);
  const summary = (
    <>
      <TrumpSummary trumpSuit={trumpSuit} compact={compact} />
      <Divider />
      <TotalSummary totalBids={totalBids} maxBid={maxBid} compact={compact} />
    </>
  );

  if (layout === 'stacked') {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center gap-3">{summary}</div>
        <PlayerChips players={players} localPlayerId={localPlayerId} currentPlayerIndex={currentPlayerIndex} wrap />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      {summary}
      <Divider />
      <PlayerChips players={players} localPlayerId={localPlayerId} currentPlayerIndex={currentPlayerIndex} wrap={false} />
    </div>
  );
}
