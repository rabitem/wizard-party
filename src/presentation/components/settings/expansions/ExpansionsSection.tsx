'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import type { ExpansionSetId, IRulesetConfig, SpecialCardType } from '@shared/domain';
import { EXPANSIONS_UI_CONFIG } from '@/presentation/config/expansions.config';
import { ExpansionPresetPicker } from './ExpansionPresetPicker';
import { SpecialCardToggleRow } from './SpecialCardToggleRow';
import {
  applyExpansionSet,
  applySpecialCardToggle,
  buildExpansionsViewModel,
} from './expansions-view-model';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface ExpansionsSectionProps {
  /** A normalized ruleset config (see ensureRulesetConfig). */
  rulesetConfig: IRulesetConfig;
  onRulesetChange: (config: IRulesetConfig) => void;
  disabled: boolean;
  defaultExpanded?: boolean;
}

/** Ruleset editor category for the expansion special cards (based on the anniversary editions). */
export function ExpansionsSection({
  rulesetConfig,
  onRulesetChange,
  disabled,
  defaultExpanded = false,
}: ExpansionsSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const viewModel = buildExpansionsViewModel(rulesetConfig.expansions.specialCards);
  const badgeLabel = viewModel.activeSet?.name ?? EXPANSIONS_UI_CONFIG.CUSTOM_SET_LABEL;

  const handleSelectSet = (setId: ExpansionSetId) => {
    onRulesetChange(applyExpansionSet(rulesetConfig, setId));
  };

  const handleToggleCard = (type: SpecialCardType, enabled: boolean) => {
    onRulesetChange(applySpecialCardToggle(rulesetConfig, type, enabled));
  };

  return (
    <div className="border border-amber-800/30 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-2 p-3 hover:bg-amber-900/20 transition-colors"
        style={{ background: THEME_SURFACE.CARD_BG }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Sparkles className="w-5 h-5 flex-shrink-0 text-amber-500/70" />
          <span className="text-amber-200/90 truncate" style={{ fontFamily: 'Georgia, serif' }}>
            {EXPANSIONS_UI_CONFIG.SECTION_TITLE}
          </span>
          {viewModel.enabledCount > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-amber-600/30 text-amber-300 whitespace-nowrap">
              {badgeLabel}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 flex-shrink-0 text-amber-500/60" />
        ) : (
          <ChevronDown className="w-4 h-4 flex-shrink-0 text-amber-500/60" />
        )}
      </button>

      {expanded ? (
        <div
          className="p-3 space-y-4 border-t border-amber-800/20"
          style={{ background: THEME_SURFACE.CARD_BG_SOFT }}
        >
          <p className="text-xs text-amber-600/60" style={{ fontFamily: 'Georgia, serif' }}>
            {EXPANSIONS_UI_CONFIG.SECTION_SUBTITLE}
          </p>

          <ExpansionPresetPicker
            presets={viewModel.presets}
            isCustom={viewModel.isCustom}
            enabledCount={viewModel.enabledCount}
            onSelect={handleSelectSet}
            disabled={disabled}
          />

          <div>
            <div className="flex items-baseline justify-between gap-2 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              <span className="text-xs text-amber-500/60 uppercase tracking-wider">
                {EXPANSIONS_UI_CONFIG.CARDS_HEADING}
              </span>
              <span className="text-xs text-amber-500/60">
                {viewModel.deckSize} {EXPANSIONS_UI_CONFIG.DECK_SIZE_UNIT}
              </span>
            </div>
            <div className="space-y-2">
              {viewModel.cards.map((card) => (
                <SpecialCardToggleRow key={card.type} card={card} onToggle={handleToggleCard} disabled={disabled} />
              ))}
            </div>
            {viewModel.enabledCount > 0 && (
              <p className="mt-2 text-[11px] text-amber-600/60" style={{ fontFamily: 'Georgia, serif' }}>
                {EXPANSIONS_UI_CONFIG.ROUND_COUNT_NOTE}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
