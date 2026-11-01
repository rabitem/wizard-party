import { CardType } from '@shared/domain';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

export interface MiniCardStyle {
  background: string;
  borderClass: string;
  textClass: string;
}

const NUMBER_CARD_STYLE: MiniCardStyle = {
  background: THEME_SURFACE.MODAL_BG,
  borderClass: 'border-amber-700/40',
  textClass: 'text-amber-200',
};

function tinted(rgb: string, borderClass: string, textClass: string): MiniCardStyle {
  return {
    background: `linear-gradient(180deg, rgba(${rgb},0.3) 0%, rgba(${rgb},0.15) 100%)`,
    borderClass,
    textClass,
  };
}

/**
 * Colour identity of each card type in compact 2D card previews.
 * Exhaustive so a new card type cannot ship without a preview style.
 */
export const MINI_CARD_STYLES: Record<CardType, MiniCardStyle> = {
  [CardType.NUMBER]: NUMBER_CARD_STYLE,
  [CardType.WIZARD]: tinted('147,51,234', 'border-purple-500/50', 'text-purple-300'),
  [CardType.JESTER]: tinted('34,197,94', 'border-green-500/50', 'text-green-300'),
  [CardType.DRAGON]: tinted('220,38,38', 'border-red-500/60', 'text-red-300'),
  [CardType.FAIRY]: tinted('244,114,182', 'border-pink-400/50', 'text-pink-200'),
  [CardType.BOMB]: tinted('120,113,108', 'border-orange-500/50', 'text-orange-300'),
  [CardType.WEREWOLF]: tinted('100,116,139', 'border-slate-400/50', 'text-slate-200'),
  [CardType.JUGGLER]: tinted('234,179,8', 'border-yellow-500/50', 'text-yellow-200'),
  [CardType.CLOUD]: tinted('56,189,248', 'border-sky-400/50', 'text-sky-200'),
  [CardType.SHAPESHIFTER]: tinted('168,85,247', 'border-fuchsia-400/50', 'text-fuchsia-200'),
  [CardType.VAMPIRE]: tinted('153,27,27', 'border-rose-700/60', 'text-rose-300'),
  [CardType.WITCH]: tinted('132,204,22', 'border-lime-500/50', 'text-lime-300'),
};
