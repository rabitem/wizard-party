'use client';

import { Lock } from 'lucide-react';

import { CLASSIC_PALETTE_SWATCH, PALETTE_COLORS } from '@/presentation/config/character-palettes.config';
import type { PartOption } from './character-editor';

function PaletteSwatch({ id }: { id: string }) {
  const colors = PALETTE_COLORS[id] ?? CLASSIC_PALETTE_SWATCH;
  return (
    <span aria-hidden className="w-6 h-6 rounded-full border border-black/30 shrink-0" style={{ background: `linear-gradient(135deg, ${colors.primary} 0 55%, ${colors.accent} 55% 100%)` }} />
  );
}

function optionClass(option: PartOption): string {
  if (option.selected) return 'border-amber-500/80 bg-amber-900/45 text-amber-100';
  if (option.locked) return 'border-amber-900/30 text-amber-200/35 cursor-not-allowed';
  return 'border-amber-900/50 text-amber-200/80 hover:border-amber-700/60 hover:text-amber-100 cursor-pointer';
}

interface PartPickerProps {
  label: string;
  options: PartOption[];
  /** Palettes show colour swatches next to their names. */
  swatches?: boolean;
  onPick: (partId: string) => void;
}

/** One slot of the editor: every part as a toggle; locked ones say how they unlock. */
export function PartPicker({ label, options, swatches = false, onPick }: PartPickerProps) {
  return (
    <fieldset>
      <legend className="text-xs uppercase tracking-wider text-amber-500/80 mb-2 font-serif">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={option.selected}
            disabled={option.locked}
            title={option.requirement ?? undefined}
            onClick={() => onPick(option.id)}
            className={`inline-flex items-center gap-2 min-h-11 rounded-xl border px-3 py-1.5 text-left text-sm font-serif transition-colors ${optionClass(option)}`}
          >
            {swatches ? <PaletteSwatch id={option.id} /> : null}
            <span className="flex flex-col leading-tight">
              <span>{option.name}</span>
              {option.requirement ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-500/60">
                  <Lock className="w-3 h-3" aria-hidden />
                  {option.requirement}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
