'use client';

import { useState } from 'react';
import { Wand2, Calculator } from 'lucide-react';
import {
  type IRuleMetadata,
  DEFAULT_RULESET_CONFIG,
  TIMEOUT_SOUND_VOLUME_LIMITS,
} from '@shared/domain';
import { MedievalToggle } from './MedievalToggle';
import { RuleVolumeSliderRow } from './RuleVolumeSliderRow';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface NumberInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  disabled: boolean;
  allowNull?: boolean;
}

interface NumberInputCommitOptions {
  currentValue: number | null;
  min?: number;
  max?: number;
  allowNull: boolean;
}

export function getNumberInputDisplayValue(value: number | null): string {
  return value === null ? '' : String(value);
}

export function commitNumberInputDraft(
  rawValue: string,
  { currentValue, min, max, allowNull }: NumberInputCommitOptions
): number | null {
  const trimmed = rawValue.trim();
  if (trimmed === '') return allowNull ? null : currentValue;

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) return currentValue;

  return Math.min(max ?? parsed, Math.max(min ?? parsed, parsed));
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  disabled,
  allowNull = false,
}: NumberInputProps) {
  const [draftValue, setDraftValue] = useState(() => getNumberInputDisplayValue(value));
  const [isEditing, setIsEditing] = useState(false);
  const inputValue = isEditing ? draftValue : getNumberInputDisplayValue(value);

  const commitDraft = () => {
    const nextValue = commitNumberInputDraft(inputValue, { currentValue: value, min, max, allowNull });
    setDraftValue(getNumberInputDisplayValue(nextValue));
    if (nextValue !== value) onChange(nextValue);
  };

  const resetDraft = () => {
    setDraftValue(getNumberInputDisplayValue(value));
  };

  const handleBlur = () => {
    setIsEditing(false);
    commitDraft();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      commitDraft();
      event.currentTarget.blur();
    }
    if (event.key === 'Escape') {
      resetDraft();
      event.currentTarget.blur();
    }
  };

  return (
    <input
      type="number"
      value={inputValue}
      onFocus={() => {
        setDraftValue(getNumberInputDisplayValue(value));
        setIsEditing(true);
      }}
      onChange={(event) => setDraftValue(event.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      min={min}
      max={max}
      className="w-16 px-2 py-1 text-sm text-amber-200 bg-black/30 border border-amber-800/40 rounded focus:outline-none focus:border-amber-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ fontFamily: 'Georgia, serif' }}
    />
  );
}

interface RuleToggleProps {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

function RuleToggle({
  title,
  description,
  enabled,
  onToggle,
  disabled = false,
  icon: Icon = Wand2,
}: RuleToggleProps) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded border transition-all ${
        enabled ? 'border-amber-600/40 bg-amber-900/20' : 'border-amber-800/30'
      }`}
      style={{
        background: enabled
          ? THEME_SURFACE.SELECTED_BG
          : THEME_SURFACE.CARD_BG,
      }}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${enabled ? 'text-amber-400' : 'text-amber-500/60'}`} />
        <div className="min-w-0">
          <span className={`block ${enabled ? 'text-amber-200' : 'text-amber-200/80'}`} style={{ fontFamily: 'Georgia, serif' }}>
            {title}
          </span>
          <p className="text-xs text-amber-600/60 mt-0.5" style={{ fontFamily: 'Georgia, serif' }}>
            {description}
          </p>
        </div>
      </div>
      <MedievalToggle enabled={enabled} onClick={onToggle} disabled={disabled} label={title} />
    </div>
  );
}

interface RuleNumberInputProps {
  title: string;
  description: string;
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  allowNull?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

function RuleNumberInputRow({
  title,
  description,
  value,
  onChange,
  disabled = false,
  min,
  max,
  allowNull = false,
  icon: Icon = Calculator,
}: RuleNumberInputProps) {
  const isModified = !!(value !== null && allowNull);

  return (
    <div
      className={`flex items-center justify-between p-3 rounded border transition-all ${
        isModified ? 'border-amber-600/40' : 'border-amber-800/30'
      }`}
      style={{
        background: isModified
          ? THEME_SURFACE.SELECTED_BG
          : THEME_SURFACE.CARD_BG,
      }}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isModified ? 'text-amber-400' : 'text-amber-500/60'}`} />
        <div className="min-w-0">
          <span className="block text-amber-200/80" style={{ fontFamily: 'Georgia, serif' }}>
            {title}
          </span>
          <p className="text-xs text-amber-600/60 mt-0.5" style={{ fontFamily: 'Georgia, serif' }}>
            {description}
          </p>
        </div>
      </div>
      <NumberInput
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        disabled={disabled}
        allowNull={allowNull}
      />
    </div>
  );
}

function getVolumeRuleValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : DEFAULT_RULESET_CONFIG.turn.timeoutSoundVolume;
}

interface RulesetRuleControlProps {
  rule: IRuleMetadata;
  value: boolean | number | null;
  onChange: (key: string, value: unknown) => void;
  disabled: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

export function RulesetRuleControl({
  rule,
  value,
  onChange,
  disabled,
  icon,
}: RulesetRuleControlProps) {
  if (rule.category === 'turn' && rule.key === 'timeoutSoundVolume') {
    return (
      <RuleVolumeSliderRow
        title={rule.name}
        description={rule.description}
        value={getVolumeRuleValue(value)}
        onChange={(newValue) => onChange(rule.key, newValue)}
        disabled={disabled}
        min={rule.min}
        max={rule.max}
        step={TIMEOUT_SOUND_VOLUME_LIMITS.STEP}
      />
    );
  }

  if (rule.type === 'boolean') {
    return (
      <RuleToggle
        title={rule.name}
        description={rule.description}
        enabled={value as boolean}
        onToggle={() => onChange(rule.key, !value)}
        disabled={disabled}
        icon={icon}
      />
    );
  }

  if (rule.type === 'number') {
    return (
      <RuleNumberInputRow
        title={rule.name}
        description={rule.description}
        value={value as number | null}
        onChange={(newValue) => onChange(rule.key, newValue)}
        disabled={disabled}
        min={rule.min}
        max={rule.max}
        allowNull={rule.defaultValue === null}
        icon={icon}
      />
    );
  }

  return null;
}
