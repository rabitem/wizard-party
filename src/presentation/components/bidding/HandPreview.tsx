'use client';

import { Suit, type ICard, getCardDefinition } from '@shared/domain';
import { MiniCard } from './MiniCard';

/** Special cards keep the hand order of their definitions (strong left, weak right). */
function compareBySpecialType(a: ICard, b: ICard): number | null {
  const aOrder = getCardDefinition(a.type).sortOrder;
  const bOrder = getCardDefinition(b.type).sortOrder;
  return aOrder === bOrder ? null : aOrder - bOrder;
}

function compareByTrump(a: ICard, b: ICard, trumpSuit: Suit | null): number | null {
  if (!trumpSuit) return null;
  if (a.suit === trumpSuit && b.suit !== trumpSuit) return -1;
  if (b.suit === trumpSuit && a.suit !== trumpSuit) return 1;
  return null;
}

function sortHandForPreview(hand: ICard[], trumpSuit: Suit | null): ICard[] {
  return [...hand].sort((a, b) => {
    const specialResult = compareBySpecialType(a, b);
    if (specialResult !== null) return specialResult;

    const trumpResult = compareByTrump(a, b, trumpSuit);
    if (trumpResult !== null) return trumpResult;

    if (a.suit && b.suit && a.suit !== b.suit) return a.suit.localeCompare(b.suit);
    return (b.value ?? 0) - (a.value ?? 0);
  });
}

export function HandPreview({ hand, trumpSuit }: { hand: ICard[]; trumpSuit: Suit | null }) {
  if (!hand || hand.length === 0) return null;

  const sortedHand = sortHandForPreview(hand, trumpSuit);

  return (
    <div className="border-t border-amber-800/30 pt-3 mt-3">
      <div className="text-[10px] text-amber-600/60 uppercase tracking-wide text-center mb-2">
        Your Hand
      </div>
      <div className="flex flex-wrap justify-center gap-1">
        {sortedHand.map((card) => (
          <MiniCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
