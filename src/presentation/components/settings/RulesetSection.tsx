'use client';

import { useState } from 'react';
import { Scroll, Wand2, Scale, Calculator, Layers, Clock, Info, ChevronDown, ChevronUp } from 'lucide-react';
import {
  type IRulesetConfig,
  RULE_CATEGORIES,
  getRulesByCategory,
  setRuleValue,
  countNonDefaultRules,
  DEFAULT_RULESET_CONFIG,
  ensureRulesetConfig,
  getDefaultBiddingTimerSeconds,
} from '@shared/domain';
import { RulesetRuleControl } from './RulesetRuleControl';
import { ExpansionsSection } from './expansions';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface RulesetSectionProps {
  rulesetConfig: IRulesetConfig;
  onRulesetChange: (config: IRulesetConfig) => void;
  isHost?: boolean;
  disabled?: boolean;
}

// Map category keys to icons
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  card: Wand2,
  bidding: Scale,
  scoring: Calculator,
  structure: Layers,
  turn: Clock,
};

function isTimeoutSoundVolumeRule(categoryKey: keyof IRulesetConfig, ruleKey: string): boolean {
  return categoryKey === 'turn' && ruleKey === 'timeoutSoundVolume';
}

function isRuleVisible(
  categoryKey: keyof IRulesetConfig,
  ruleKey: string,
  config: IRulesetConfig
): boolean {
  if (!isTimeoutSoundVolumeRule(categoryKey, ruleKey)) return true;
  return config.turn.biddingTimerSeconds !== null || config.turn.playTimerSeconds !== null;
}

interface CategorySectionProps {
  categoryKey: keyof IRulesetConfig;
  categoryName: string;
  rulesetConfig: IRulesetConfig;
  onRulesetChange: (config: IRulesetConfig) => void;
  disabled: boolean;
  defaultExpanded?: boolean;
}

function CategorySection({
  categoryKey,
  categoryName,
  rulesetConfig,
  onRulesetChange,
  disabled,
  defaultExpanded = false,
}: CategorySectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rules = getRulesByCategory(categoryKey);
  const Icon = CATEGORY_ICONS[categoryKey] || Wand2;
  const normalizedRulesetConfig = ensureRulesetConfig(rulesetConfig);
  const visibleRules = rules.filter((rule) => isRuleVisible(categoryKey, rule.key, normalizedRulesetConfig));

  // Count non-default rules in this category
  const categoryConfig = normalizedRulesetConfig[categoryKey];
  const defaultCategoryConfig = DEFAULT_RULESET_CONFIG[categoryKey];
  const nonDefaultCount = visibleRules.filter(
    (rule) => categoryConfig[rule.key as keyof typeof categoryConfig] !== defaultCategoryConfig[rule.key as keyof typeof defaultCategoryConfig]
  ).length;

  const handleRuleChange = (key: string, value: unknown) => {
    let newConfig = setRuleValue(
      normalizedRulesetConfig,
      categoryKey,
      key as keyof IRulesetConfig[typeof categoryKey],
      value as IRulesetConfig[typeof categoryKey][keyof IRulesetConfig[typeof categoryKey]]
    );
    if (
      categoryKey === 'turn' &&
      key === 'playTimerSeconds' &&
      typeof value === 'number' &&
      normalizedRulesetConfig.turn.biddingTimerSeconds === null
    ) {
      newConfig = setRuleValue(newConfig, 'turn', 'biddingTimerSeconds', getDefaultBiddingTimerSeconds(value));
    }
    onRulesetChange(newConfig);
  };

  return (
    <div className="border border-amber-800/30 rounded-lg overflow-hidden">
      {/* Category Header */}
      <button
        // Also rendered inside the tournament form, where an untyped button would submit it.
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-amber-900/20 transition-colors"
        style={{
          background: THEME_SURFACE.CARD_BG,
        }}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-amber-500/70" />
          <span
            className="text-amber-200/90 font-serif"
          >
            {categoryName}
          </span>
          {nonDefaultCount > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-amber-600/30 text-amber-300">
              {nonDefaultCount} modified
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-amber-500/60" />
        ) : (
          <ChevronDown className="w-4 h-4 text-amber-500/60" />
        )}
      </button>

      {/* Rules List */}
      {expanded ? <div
          className="p-3 space-y-3 border-t border-amber-800/20"
          style={{
            background: THEME_SURFACE.CARD_BG_SOFT,
          }}
        >
          {visibleRules.map((rule) => {
            const value = categoryConfig[rule.key as keyof typeof categoryConfig];
            return (
              <RulesetRuleControl
                key={rule.key}
                rule={rule}
                value={value as boolean | number | null}
                onChange={handleRuleChange}
                disabled={disabled}
                icon={Icon}
              />
            );
          })}
        </div> : null}
    </div>
  );
}

export function RulesetSection({
  rulesetConfig,
  onRulesetChange,
  isHost = true,
  disabled = false,
}: RulesetSectionProps) {
  const normalizedRulesetConfig = ensureRulesetConfig(rulesetConfig);
  const totalNonDefault = countNonDefaultRules(normalizedRulesetConfig);
  const isDisabled = disabled || !isHost;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/30" />
        <Scroll className="w-4 h-4 text-amber-500/60" />
        <span
          className="text-xs text-amber-400/70 uppercase tracking-widest font-serif"
        >
          Game Rules
        </span>
        {totalNonDefault > 0 && (
          <span className="text-xs text-amber-500/50">
            ({totalNonDefault} modified)
          </span>
        )}
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/30" />
      </div>

      {!isHost && (
        <div
          className="flex items-center gap-2 mb-3 p-2 rounded border border-amber-800/20"
          style={{
            background: THEME_SURFACE.CARD_BG_SOFT,
          }}
        >
          <Info className="w-4 h-4 text-amber-500/50 flex-shrink-0" />
          <span
            className="text-xs text-amber-500/60 font-serif"
          >
            Only the host can modify game rules
          </span>
        </div>
      )}

      <div className="space-y-3">
        {RULE_CATEGORIES.map((category, index) => (
          <CategorySection
            key={category.key}
            categoryKey={category.key}
            categoryName={category.name}
            rulesetConfig={normalizedRulesetConfig}
            onRulesetChange={onRulesetChange}
            disabled={isDisabled}
            defaultExpanded={index === 0} // First category expanded by default
          />
        ))}
        <ExpansionsSection
          rulesetConfig={normalizedRulesetConfig}
          onRulesetChange={onRulesetChange}
          disabled={isDisabled}
        />
      </div>
    </section>
  );
}
