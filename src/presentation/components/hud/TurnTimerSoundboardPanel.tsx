'use client';

import { ChevronDown, ChevronUp, Music, Pin, SlidersHorizontal } from 'lucide-react';
import type { ITurnTimerState } from '@shared/domain';
import type { TimeoutSoundboardOption } from './timeout-soundboard-options';
import type { TimeoutSoundboardPreferences } from './timeout-soundboard-preferences';

interface TurnTimerSoundboardPanelProps {
  targetName: string;
  align: 'left' | 'right' | 'center';
  placement: 'above' | 'below';
  canUseSoundboard: boolean;
  timer: ITurnTimerState;
  options: TimeoutSoundboardOption[];
  preferences: TimeoutSoundboardPreferences;
  arrangeMode: boolean;
  onArrangeModeChange: (enabled: boolean) => void;
  onMoveOption: (optionId: string, direction: -1 | 1) => void;
  onTogglePin: (optionId: string) => void;
  onPlay: (option: TimeoutSoundboardOption) => void;
}

interface SoundboardOptionCardProps {
  option: TimeoutSoundboardOption;
  index: number;
  optionsLength: number;
  arrangeMode: boolean;
  canUseSoundboard: boolean;
  pinned: boolean;
  onMoveOption: (optionId: string, direction: -1 | 1) => void;
  onTogglePin: (optionId: string) => void;
  onPlay: (option: TimeoutSoundboardOption) => void;
}

function getSoundboardStatusLabel(canUseSoundboard: boolean, timer: ITurnTimerState): string {
  if (canUseSoundboard) return 'Ready';
  if (!timer.expired) return 'Locked';
  return 'Unavailable';
}

function getPlacementClass(placement: 'above' | 'below'): string {
  return placement === 'above' ? 'bottom-full mb-2' : 'top-full mt-2';
}

function getAlignClass(align: 'left' | 'right' | 'center'): string {
  if (align === 'left') return 'left-0';
  if (align === 'right') return 'right-0';
  return 'left-1/2 -translate-x-1/2';
}

function SoundboardOptionCard({
  option,
  index,
  optionsLength,
  arrangeMode,
  canUseSoundboard,
  pinned,
  onMoveOption,
  onTogglePin,
  onPlay,
}: SoundboardOptionCardProps) {
  return (
    <div className={`relative rounded border transition-colors ${canUseSoundboard ? 'border-amber-800/30 bg-black/20' : 'border-stone-800/50 bg-stone-950/30'}`}>
      {arrangeMode ? (
        <div className="absolute right-1 top-1 z-10 flex gap-1">
          <button
            type="button"
            onClick={() => onMoveOption(option.id, -1)}
            disabled={index === 0}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-amber-800/40 bg-[color-mix(in_srgb,_var(--surface),_black_40%)]/95 text-amber-400/70 transition-colors hover:bg-amber-900/30 disabled:cursor-default disabled:opacity-30"
            aria-label={`Move ${option.label} up`}
            title="Move up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMoveOption(option.id, 1)}
            disabled={index === optionsLength - 1}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-amber-800/40 bg-[color-mix(in_srgb,_var(--surface),_black_40%)]/95 text-amber-400/70 transition-colors hover:bg-amber-900/30 disabled:cursor-default disabled:opacity-30"
            aria-label={`Move ${option.label} down`}
            title="Move down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => onPlay(option)}
        disabled={!canUseSoundboard}
        className={`min-h-14 w-full rounded px-2.5 py-2 text-left transition-colors active:translate-y-px ${canUseSoundboard ? 'cursor-pointer hover:border-amber-600/50 hover:bg-amber-900/25' : 'cursor-not-allowed opacity-45 grayscale'}`}
      >
        <span className="block truncate pr-7 text-sm text-amber-100 font-serif">
          {option.label}
        </span>
        <span className="mt-0.5 block truncate text-[10px] uppercase tracking-wider text-amber-600/60">
          {option.ownerName ? `${option.ownerName} / ${option.group}` : option.group}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onTogglePin(option.id)}
        className={`absolute right-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded border transition-colors ${pinned ? 'border-amber-500/50 bg-amber-900/40 text-amber-200' : 'border-amber-800/30 bg-[color-mix(in_srgb,_var(--surface),_black_40%)]/90 text-amber-500/50 hover:bg-amber-900/30 hover:text-amber-200'} ${arrangeMode ? 'hidden' : ''}`}
        aria-pressed={pinned}
        aria-label={pinned ? `Unpin ${option.label}` : `Pin ${option.label}`}
        title={pinned ? 'Unpin' : 'Pin'}
      >
        <Pin className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function TurnTimerSoundboardPanel({
  targetName,
  align,
  placement,
  canUseSoundboard,
  timer,
  options,
  preferences,
  arrangeMode,
  onArrangeModeChange,
  onMoveOption,
  onTogglePin,
  onPlay,
}: TurnTimerSoundboardPanelProps) {
  const pinnedIds = new Set(preferences.pinnedIds);
  const statusLabel = getSoundboardStatusLabel(canUseSoundboard, timer);

  return (
    <div
      className={`timeout-soundboard-panel timeout-soundboard-panel-${placement} absolute ${getPlacementClass(placement)} ${getAlignClass(align)} w-[min(92vw,420px)] rounded border ${canUseSoundboard ? 'border-amber-700/40' : 'border-stone-700/60'} bg-[color-mix(in_srgb,_var(--surface),_black_40%)]/95 shadow-2xl`}
      style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.35), 0 18px 48px rgba(0,0,0,0.45)' }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-amber-800/30 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Music className="h-4 w-4 flex-shrink-0 text-amber-400" />
          <span className="min-w-0 truncate text-sm text-amber-200 font-serif">
            Soundboard for {targetName}
          </span>
          <span className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${canUseSoundboard ? 'border-red-600/40 text-red-200' : 'border-stone-700/60 text-stone-400'}`}>
            {statusLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onArrangeModeChange(!arrangeMode)}
          className={`flex h-7 items-center gap-1 rounded border px-2 text-xs transition-colors ${arrangeMode ? 'border-amber-500/50 bg-amber-900/30 text-amber-200' : 'border-amber-800/30 text-amber-400/70 hover:bg-amber-900/30 hover:text-amber-200'}`}
          title="Arrange tracks"
          aria-pressed={arrangeMode}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Order
        </button>
      </div>
      <div className="grid max-h-[44vh] grid-cols-2 gap-2 overflow-y-auto p-3 sm:grid-cols-3">
        {options.map((option, index) => (
          <SoundboardOptionCard
            key={option.id}
            option={option}
            index={index}
            optionsLength={options.length}
            arrangeMode={arrangeMode}
            canUseSoundboard={canUseSoundboard}
            pinned={pinnedIds.has(option.id)}
            onMoveOption={onMoveOption}
            onTogglePin={onTogglePin}
            onPlay={onPlay}
          />
        ))}
      </div>
    </div>
  );
}
