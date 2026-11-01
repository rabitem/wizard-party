'use client';

import { ALL_SUITS, type Suit } from '@shared/domain';
import { useCurrentCardTheme } from '@/presentation/hooks/useCardTheme';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

const CHOICE_BUTTON_CLASS =
  'group relative p-3 sm:p-4 border-2 border-amber-800/40 hover:border-amber-600/60 transition-all cursor-pointer active:scale-95';
const CHOICE_BUTTON_BACKGROUND = THEME_SURFACE.MODAL_BG;
const SERIF = { fontFamily: 'Georgia, serif' } as const;

interface ChoiceButtonProps {
  color: string;
  icon: string;
  label: string;
  detail?: string;
  onClick: () => void;
  ariaLabel?: string;
}

/** One big medieval choice button (a suit, a form, raise/lower...) */
export function ChoiceButton({ color, icon, label, detail, onClick, ariaLabel }: ChoiceButtonProps) {
  return (
    <button onClick={onClick} aria-label={ariaLabel ?? label} className={CHOICE_BUTTON_CLASS} style={{ background: CHOICE_BUTTON_BACKGROUND }}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-15 transition-opacity" style={{ backgroundColor: color }} />
      <div className="absolute inset-[2px] opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-amber-600/10 to-transparent pointer-events-none" />
      <div className="text-2xl sm:text-3xl text-center mb-1.5 sm:mb-2 relative group-hover:scale-110 transition-transform" style={{ color }}>
        <i className={`ra ${icon}`} />
      </div>
      <div className="text-center text-[10px] sm:text-xs relative font-medium" style={{ color, ...SERIF }}>{label}</div>
      {detail ? (
        <div className="text-center text-[9px] sm:text-[10px] relative text-amber-200/50 mt-0.5" style={SERIF}>{detail}</div>
      ) : null}
    </button>
  );
}

interface SuitChoiceGridProps {
  onSelect: (suit: Suit) => void;
  /** Optional extra option rendered after the suits (e.g. "No trump"). */
  extraOption?: Omit<ChoiceButtonProps, 'color'> & { color?: string };
  /** Marks the trump suit so players see which announcement wins. */
  trumpSuit?: Suit | null;
}

/**
 * The four suits in the current card theme's colours and names.
 */
export function SuitChoiceGrid({ onSelect, extraOption, trumpSuit = null }: SuitChoiceGridProps) {
  const cardTheme = useCurrentCardTheme();
  const columns = extraOption ? 'sm:grid-cols-5' : 'sm:grid-cols-4';

  return (
    <div className={`grid grid-cols-2 ${columns} gap-2 sm:gap-3`}>
      {ALL_SUITS.map((suit) => {
        const theme = cardTheme.suits[suit];
        return (
          <ChoiceButton
            key={suit}
            color={theme.accent}
            icon={theme.symbol}
            label={theme.name}
            detail={suit === trumpSuit ? 'Trump' : undefined}
            onClick={() => onSelect(suit)}
          />
        );
      })}
      {extraOption ? <ChoiceButton color="#b7a68a" {...extraOption} /> : null}
    </div>
  );
}
