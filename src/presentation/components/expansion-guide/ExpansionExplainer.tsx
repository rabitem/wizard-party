'use client';

import { ChevronLeft } from 'lucide-react';
import { isSpecialCardType, type ExpansionSetId } from '@shared/domain';
import { EXPANSIONS_UI_CONFIG } from '@/presentation/config/expansions.config';
import { ExpansionCredits } from './ExpansionCredits';
import { buildExpansionExplanation } from './expansion-guide';
import { SPECIAL_CARD_ICONS } from './special-card-icons';

interface ExpansionExplainerProps {
  setId: ExpansionSetId;
  /** Shows a back link (e.g. to the edition picker) when given. */
  onBack?: () => void;
}

/** One edition: its year, description and every card it adds, with credits. */
export function ExpansionExplainer({ setId, onBack }: ExpansionExplainerProps) {
  const explanation = buildExpansionExplanation(setId);

  return (
    <div className="space-y-4 font-serif">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-amber-500/70 hover:text-amber-300 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {EXPANSIONS_UI_CONFIG.GUIDE_BACK_LABEL}
        </button>
      ) : null}

      <header>
        <h3 className="text-lg text-amber-200/90 tracking-wide">{explanation.name}</h3>
        <p className="text-xs text-amber-600/70">{explanation.yearLabel}</p>
        <p className="mt-1 text-sm text-amber-300/70">{explanation.description}</p>
      </header>

      <ul className="space-y-3">
        {explanation.cards.map((card) => {
          const Icon = isSpecialCardType(card.type) ? SPECIAL_CARD_ICONS[card.type] : null;
          return (
            <li key={card.type} className="flex items-start gap-3 pl-3 border-l-2 border-amber-800/30">
              {Icon ? <Icon className="w-4 h-4 mt-1 flex-shrink-0 text-amber-500/70" /> : null}
              <div className="min-w-0">
                <p className="text-sm text-amber-200/85">
                  {card.name} <span className="text-xs italic text-amber-600/60">({card.germanName})</span>
                </p>
                <p className="text-xs text-amber-500/70">{card.rank}</p>
                <p className="mt-1 text-xs text-amber-300/70 leading-relaxed">{card.rules}</p>
                <p className="mt-0.5 text-xs text-amber-500/60">
                  <span className="text-amber-500/80">{EXPANSIONS_UI_CONFIG.AS_TRUMP_CARD_LABEL}:</span> {card.asTrumpCard}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <ExpansionCredits sources={explanation.sources} />
    </div>
  );
}
