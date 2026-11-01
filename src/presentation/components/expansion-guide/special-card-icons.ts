import { Bomb, Cloud, Droplet, Flame, Moon, Repeat2, Shuffle, Sparkle, WandSparkles } from 'lucide-react';
import { CardType, type SpecialCardType } from '@shared/domain';

type IconComponent = React.ComponentType<{ className?: string }>;

/** Lobby icon for each special card. */
export const SPECIAL_CARD_ICONS: Readonly<Record<SpecialCardType, IconComponent>> = {
  [CardType.DRAGON]: Flame,
  [CardType.FAIRY]: Sparkle,
  [CardType.BOMB]: Bomb,
  [CardType.WEREWOLF]: Moon,
  [CardType.JUGGLER]: Shuffle,
  [CardType.CLOUD]: Cloud,
  [CardType.SHAPESHIFTER]: Repeat2,
  [CardType.VAMPIRE]: Droplet,
  [CardType.WITCH]: WandSparkles,
};
