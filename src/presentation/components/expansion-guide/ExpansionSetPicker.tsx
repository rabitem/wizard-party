'use client';

import { ChevronRight } from 'lucide-react';
import type { ExpansionSetId } from '@shared/domain';
import { EXPANSIONS_UI_CONFIG } from '@/presentation/config/expansions.config';
import { getExpansionYearLabel, getExplainableExpansionSets } from './expansion-guide';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface ExpansionSetPickerProps {
  onSelect: (setId: ExpansionSetId) => void;
}

/** One entry per anniversary edition; selecting one opens its explainer. */
export function ExpansionSetPicker({ onSelect }: ExpansionSetPickerProps) {
  return (
    <ul className="space-y-2 font-serif">
      {getExplainableExpansionSets().map((set) => (
        <li key={set.id}>
          <button
            type="button"
            onClick={() => onSelect(set.id)}
            className="w-full flex items-center justify-between gap-3 p-3 rounded border border-amber-800/30 hover:border-amber-600/50 text-left transition-colors cursor-pointer"
            style={{ background: THEME_SURFACE.CARD_BG }}
          >
            <span className="min-w-0">
              <span className="block text-sm text-amber-200/90">{set.name}</span>
              <span className="block text-xs text-amber-600/70">
                {getExpansionYearLabel(set)} · {set.cards.length} {EXPANSIONS_UI_CONFIG.GUIDE_SPECIAL_CARDS_UNIT}
              </span>
            </span>
            <ChevronRight className="w-4 h-4 flex-shrink-0 text-amber-500/60" />
          </button>
        </li>
      ))}
    </ul>
  );
}
