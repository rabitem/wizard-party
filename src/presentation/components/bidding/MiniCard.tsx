'use client';

import { useCurrentCardTheme } from '@/presentation/hooks/useCardTheme';
import { type ICard, CardType, getCardCatalogEntry } from '@shared/domain';
import { MINI_CARD_STYLES } from './mini-card-styles';

const FACE_LABELS: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

function getRankDisplay(card: ICard): string {
  if (card.type !== CardType.NUMBER) return getCardCatalogEntry(card.type).cornerLabel;
  return FACE_LABELS[card.value ?? 0] ?? card.value?.toString() ?? '';
}

export function MiniCard({ card }: { card: ICard }) {
  const cardTheme = useCurrentCardTheme();
  const theme = card.suit ? cardTheme.suits[card.suit] : null;
  const style = MINI_CARD_STYLES[card.type] ?? MINI_CARD_STYLES[CardType.NUMBER];

  return (
    <div
      className={`w-8 h-11 flex flex-col items-center justify-center border ${style.borderClass} relative`}
      style={{ background: style.background }}
      title={card.type === CardType.NUMBER ? undefined : getCardCatalogEntry(card.type).name}
    >
      <span className={`font-serif text-xs font-bold leading-none ${style.textClass}`}>
        {getRankDisplay(card)}
      </span>
      {theme ? <i
          className={`ra ${theme.symbol} text-[10px] leading-none mt-0.5`}
          style={{ color: theme.accent }}
        /> : null}
    </div>
  );
}
