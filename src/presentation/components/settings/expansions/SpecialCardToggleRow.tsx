'use client';

import { useId, useState } from 'react';
import { ChevronDown, Link2 } from 'lucide-react';
import type { SpecialCardType } from '@shared/domain';
import { EXPANSIONS_UI_CONFIG } from '@/presentation/config/expansions.config';
import { SPECIAL_CARD_ICONS } from '@/presentation/components/expansion-guide';
import { MedievalToggle } from '../MedievalToggle';
import type { SpecialCardRow } from './expansions-view-model';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface SpecialCardToggleRowProps {
  card: SpecialCardRow;
  onToggle: (type: SpecialCardType, enabled: boolean) => void;
  disabled: boolean;
}

/** One special card: name, German name, rank, pairing hint, expandable rules and its toggle. */
export function SpecialCardToggleRow({ card, onToggle, disabled }: SpecialCardToggleRowProps) {
  const [showRules, setShowRules] = useState(false);
  const rulesId = useId();
  const Icon = SPECIAL_CARD_ICONS[card.type];

  return (
    <div
      className={`p-3 rounded border transition-all ${card.enabled ? 'border-amber-600/40' : 'border-amber-800/30'}`}
      style={{
        background: card.enabled
          ? THEME_SURFACE.SELECTED_BG
          : THEME_SURFACE.CARD_BG,
        fontFamily: 'var(--font-serif)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${card.enabled ? 'text-amber-400' : 'text-amber-500/60'}`} />
          <div className="min-w-0">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className={card.enabled ? 'text-amber-200' : 'text-amber-200/80'}>{card.name}</span>
              <span className="text-xs italic text-amber-600/60">{card.germanName}</span>
            </span>
            <p className="text-xs text-amber-500/70 mt-0.5">{card.rank}</p>
            {card.pairedWith ? (
              <p className="flex items-center gap-1 text-[11px] text-amber-600/70 mt-1">
                <Link2 className="w-3 h-3 flex-shrink-0" />
                {EXPANSIONS_UI_CONFIG.PAIRED_WITH_LABEL} {card.pairedWith.name}
              </p>
            ) : null}
          </div>
        </div>
        <MedievalToggle
          enabled={card.enabled}
          onClick={() => onToggle(card.type, !card.enabled)}
          disabled={disabled}
          label={card.name}
        />
      </div>

      <button
        type="button"
        onClick={() => setShowRules(!showRules)}
        aria-expanded={showRules}
        aria-controls={rulesId}
        className="mt-2 ml-8 flex items-center gap-1 text-[11px] text-amber-500/60 hover:text-amber-400 transition-colors cursor-pointer"
      >
        {EXPANSIONS_UI_CONFIG.RULES_TOGGLE_LABEL}
        <ChevronDown className={`w-3 h-3 transition-transform ${showRules ? 'rotate-180' : ''}`} />
      </button>
      {showRules ? (
        <div id={rulesId} className="mt-1.5 ml-8 space-y-1 text-xs text-amber-300/70 leading-relaxed">
          <p>{card.rules}</p>
          <p className="text-amber-500/60">
            <span className="text-amber-500/80">{EXPANSIONS_UI_CONFIG.AS_TRUMP_CARD_LABEL}:</span> {card.asTrumpCard}
          </p>
        </div>
      ) : null}
    </div>
  );
}
