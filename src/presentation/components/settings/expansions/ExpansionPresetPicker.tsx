'use client';

import type { ExpansionSetId } from '@shared/domain';
import { EXPANSIONS_UI_CONFIG } from '@/presentation/config/expansions.config';
import type { ExpansionPresetOption } from './expansions-view-model';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface ExpansionPresetPickerProps {
  presets: readonly ExpansionPresetOption[];
  isCustom: boolean;
  enabledCount: number;
  onSelect: (setId: ExpansionSetId) => void;
  disabled: boolean;
}

const ACTIVE_BACKGROUND = THEME_SURFACE.ACTIVE_BG;
const IDLE_BACKGROUND = THEME_SURFACE.CARD_BG;

interface PresetCardProps {
  preset: ExpansionPresetOption;
  onSelect: (setId: ExpansionSetId) => void;
  disabled: boolean;
}

function PresetCard({ preset, onSelect, disabled }: PresetCardProps) {
  return (
    <button
      type="button"
      aria-pressed={preset.isActive}
      title={preset.description}
      onClick={() => onSelect(preset.id)}
      disabled={disabled}
      className={`flex flex-col items-start gap-0.5 p-2.5 rounded border text-left transition-all ${
        preset.isActive ? 'border-amber-500/60' : 'border-amber-800/30 hover:border-amber-700/50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{
        background: preset.isActive ? ACTIVE_BACKGROUND : IDLE_BACKGROUND,
        boxShadow: preset.isActive ? '0 0 12px color-mix(in srgb, var(--accent) 15%, transparent)' : 'none',
        fontFamily: 'Georgia, serif',
      }}
    >
      <span className={`text-sm leading-tight ${preset.isActive ? 'text-amber-100' : 'text-amber-200/80'}`}>
        {preset.name}
      </span>
      <span className="text-[11px] text-amber-600/70">
        {preset.year ?? EXPANSIONS_UI_CONFIG.ORIGINAL_EDITION_LABEL}
        {preset.cardCount > 0 ? ` · +${preset.cardCount}` : null}
      </span>
    </button>
  );
}

/** Edition presets; highlights the matching one, or shows a "Custom" badge. */
export function ExpansionPresetPicker({
  presets,
  isCustom,
  enabledCount,
  onSelect,
  disabled,
}: ExpansionPresetPickerProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2" style={{ fontFamily: 'Georgia, serif' }}>
        <span className="text-xs text-amber-500/60 uppercase tracking-wider">
          {EXPANSIONS_UI_CONFIG.PRESETS_HEADING}
        </span>
        {isCustom ? (
          <span className="px-2 py-0.5 text-xs rounded-full border border-amber-500/50 bg-amber-600/30 text-amber-200">
            {EXPANSIONS_UI_CONFIG.CUSTOM_SET_LABEL} · {enabledCount}
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {presets.map((preset) => (
          <PresetCard key={preset.id} preset={preset} onSelect={onSelect} disabled={disabled} />
        ))}
      </div>
    </div>
  );
}
