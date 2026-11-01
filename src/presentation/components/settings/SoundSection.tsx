"use client";

import type { SharedCustomSound, SoundCategory } from "@shared/domain";
import type { SoundName, SoundSettings } from "@/lib/sounds";
import { Check, Download, Drama, Play, Skull, Trophy, Users, Volume2, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  getImportedSharedSoundId,
  type JesterSoundPreference,
  type TrickWinSoundPreference,
  type WizardSoundPreference,
} from "./settings-persistence";
import {
  JESTER_SOUND_PRESETS,
  SOUND_CATEGORY_LABELS,
  TRICK_WIN_SOUND_PRESETS,
  WIZARD_SOUND_PRESETS,
  getSoundPresetCategory,
  type SoundPreset,
} from "./settings-presets";
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface SoundSectionProps {
  settings: SoundSettings;
  wizardSound: WizardSoundPreference;
  jesterSound: JesterSoundPreference;
  trickWinSound: TrickWinSoundPreference;
  sharedCustomSounds: SharedCustomSound[];
  onToggleSound: () => void;
  onToggleChaosMode: () => void;
  onVolumeChange: (volume: number) => void;
  onWizardSoundChange: (sound: WizardSoundPreference) => void;
  onJesterSoundChange: (sound: JesterSoundPreference) => void;
  onTrickWinSoundChange: (sound: TrickWinSoundPreference) => void;
  onPreviewSound: (sound: SoundName) => void;
  onPreviewCustomSound: (dataUrl: string) => void;
  onImportSharedSound: (sound: SharedCustomSound) => void;
  importedSharedSoundIds: string[];
}

function MedievalToggle({
  enabled,
  onClick,
}: {
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative w-12 h-6 rounded transition-all cursor-pointer border border-amber-800/40 flex items-center"
      style={{
        background: enabled
          ? THEME_SURFACE.ACTIVE_BG
          : THEME_SURFACE.INACTIVE_BG,
      }}
    >
      <div
        className={`w-5 h-5 rounded transition-transform ${
          enabled ? "translate-x-[26px]" : "translate-x-0.5"
        }`}
        style={{
          background: enabled
            ? "linear-gradient(180deg, var(--accent) 0%, var(--accent-deep) 100%)"
            : "linear-gradient(180deg, var(--accent-dim) 0%, color-mix(in srgb, var(--accent-dim), black 30%) 100%)",
          boxShadow: enabled ? "0 0 8px color-mix(in srgb, var(--accent) 40%, transparent)" : "none",
        }}
      />
    </button>
  );
}

function SoundPicker<T extends string>({
  title,
  icon: Icon,
  presets,
  selected,
  onSelect,
  onPreview,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  presets: SoundPreset<T>[];
  selected: T;
  onSelect: (id: T) => void;
  onPreview: (id: T) => void;
}) {
  const [categoryFilter, setCategoryFilter] = useState<SoundCategory | "all">("all");
  const categoryOptions = useMemo(() => {
    const categories = new Set<SoundCategory>();
    for (const preset of presets) {
      if (preset.id !== "random") categories.add(getSoundPresetCategory(preset));
    }
    return Array.from(categories);
  }, [presets]);
  const filteredPresets = useMemo(() => (
    categoryFilter === "all"
      ? presets
      : presets.filter((preset) => preset.id === "random" || getSoundPresetCategory(preset) === categoryFilter)
  ), [categoryFilter, presets]);

  return (
    <div
      className="p-3 rounded border border-amber-800/30"
      style={{
        background:
          THEME_SURFACE.CARD_BG,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-amber-500/60 flex-shrink-0" />
        <span
          className="text-amber-200/80 text-sm flex-1 min-w-0"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {title}
        </span>
        {categoryOptions.length > 1 ? (
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as SoundCategory | "all")}
            aria-label={`${title} category`}
            className="rounded border border-amber-800/30 bg-black/30 px-2 py-1 text-xs text-amber-200/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
            style={{ fontFamily: "Georgia, serif" }}
          >
            <option value="all">All</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>{SOUND_CATEGORY_LABELS[category]}</option>
            ))}
          </select>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {filteredPresets.map((preset) => (
          <div
            key={preset.id}
            className={`relative p-2 rounded border transition-all text-center ${
              selected === preset.id
                ? "border-amber-500 bg-amber-900/30"
                : "border-amber-800/30 hover:border-amber-700/50 hover:bg-amber-900/20"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(preset.id)}
              aria-pressed={selected === preset.id}
              aria-label={`Select ${preset.label}`}
              className="absolute inset-0 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
            />
            <div className="relative pointer-events-none">
              <div className="text-lg mb-1">{preset.icon}</div>
              <div
                className={`text-xs ${
                  selected === preset.id ? "text-amber-300" : "text-amber-400/70"
                }`}
                style={{ fontFamily: "Georgia, serif" }}
              >
                  {preset.label}
              </div>
              {preset.id !== "random" ? (
                <div
                  className="mt-1 text-[10px] text-amber-600/50"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  {SOUND_CATEGORY_LABELS[getSoundPresetCategory(preset)]}
                </div>
              ) : null}
            </div>
            {preset.id !== "random" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(preset.id);
                }}
                className="absolute top-1 right-1 p-1 rounded hover:bg-amber-800/30 transition-colors cursor-pointer z-10"
                title="Preview sound"
                type="button"
              >
                <Play className="w-3 h-3 text-amber-500/60" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface SharedSoundGroup {
  ownerId: string;
  ownerName: string;
  sounds: SharedCustomSound[];
}

function groupSharedCustomSounds(sounds: SharedCustomSound[]): SharedSoundGroup[] {
  const groups = new Map<string, SharedSoundGroup>();

  for (const sound of sounds) {
    const group = groups.get(sound.ownerId) ?? {
      ownerId: sound.ownerId,
      ownerName: sound.ownerName,
      sounds: [],
    };
    group.sounds.push(sound);
    groups.set(sound.ownerId, group);
  }

  return Array.from(groups.values());
}

function SharedSoundPicker({
  sounds,
  onPreview,
  onImport,
  importedSoundIds,
}: {
  sounds: SharedCustomSound[];
  onPreview: (dataUrl: string) => void;
  onImport: (sound: SharedCustomSound) => void;
  importedSoundIds: string[];
}) {
  const groups = groupSharedCustomSounds(sounds);
  const importedSoundIdSet = new Set(importedSoundIds);

  return (
    <div
      className="p-3 rounded border border-amber-800/30"
      style={{
        background:
          THEME_SURFACE.CARD_BG,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-amber-500/60" />
        <span
          className="text-amber-200/80 text-sm"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Shared Party Sounds
        </span>
      </div>
      {groups.length > 0 ? (
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.ownerId} className="space-y-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-px flex-1 bg-amber-800/20" />
                <span
                  className="text-xs text-amber-500/70 truncate"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  {group.ownerName}
                </span>
                <div className="h-px flex-1 bg-amber-800/20" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.sounds.map((sound) => {
                  const imported = importedSoundIdSet.has(getImportedSharedSoundId(sound));
                  return (
                    <div
                      key={`${group.ownerId}-${sound.id}`}
                      className="flex items-center gap-2 min-w-0 p-2 rounded border border-amber-800/30 text-amber-400/80"
                    >
                      <span className="flex-1 min-w-0 text-xs truncate" style={{ fontFamily: "Georgia, serif" }}>
                        {sound.name}
                      </span>
                      <span className="hidden sm:inline text-[10px] text-amber-600/50" style={{ fontFamily: "Georgia, serif" }}>
                        {SOUND_CATEGORY_LABELS[sound.category ?? "custom"]}
                      </span>
                      <button
                        type="button"
                        onClick={() => onPreview(sound.dataUrl)}
                        className="p-1 rounded hover:bg-amber-800/30 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
                        title="Preview sound"
                        aria-label={`Preview ${sound.name} shared by ${group.ownerName}`}
                      >
                        <Play className="w-3 h-3 text-amber-500/60" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onImport(sound)}
                        disabled={imported}
                        className="p-1 rounded hover:bg-amber-800/30 transition-colors cursor-pointer disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
                        title={imported ? "Imported" : "Import sound"}
                        aria-label={imported ? `${sound.name} is already imported` : `Import ${sound.name} shared by ${group.ownerName}`}
                      >
                        {imported ? <Check className="w-3 h-3 text-emerald-400" /> : <Download className="w-3 h-3 text-amber-500/60" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-amber-500/50" style={{ fontFamily: "Georgia, serif" }}>
          No shared sounds yet
        </p>
      )}
    </div>
  );
}

/** Section header with icon and dividers */
function SectionHeader() {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/30" />
      <Volume2 className="w-4 h-4 text-amber-500/60" />
      <span className="text-xs text-amber-400/70 uppercase tracking-widest" style={{ fontFamily: "Georgia, serif" }}>Sound</span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/30" />
    </div>
  );
}

/** Volume slider control */
function VolumeSlider({ volume, onVolumeChange }: { volume: number; onVolumeChange: (v: number) => void }) {
  return (
    <div className="px-3 py-2">
      <label className="text-sm text-amber-500/60" style={{ fontFamily: "Georgia, serif" }}>Volume</label>
      <input type="range" min="0" max="100" value={volume * 100} onChange={(e) => onVolumeChange(Number(e.target.value) / 100)} className="w-full h-2 bg-amber-900/30 rounded appearance-none cursor-pointer accent-amber-600" />
    </div>
  );
}

/** Chaos mode toggle with danger styling */
function ChaosModeToggle({ chaosMode, onToggle }: { chaosMode: boolean; onToggle: () => void }) {
  const bgStyle = chaosMode ? "linear-gradient(180deg, rgba(80,20,20,0.6) 0%, rgba(50,15,15,0.6) 100%)" : THEME_SURFACE.CARD_BG;
  return (
    <div className="flex items-center justify-between p-3 rounded border border-red-800/30" style={{ background: bgStyle }}>
      <div className="flex items-center gap-2">
        <Skull className={`w-4 h-4 ${chaosMode ? "text-red-400" : "text-amber-500/60"}`} />
        <div>
          <span className={chaosMode ? "text-red-300" : "text-amber-200/80"} style={{ fontFamily: "Georgia, serif" }}>Chaos Mode</span>
          <p className="text-xs text-amber-600/50" style={{ fontFamily: "Georgia, serif" }}>Extra loud wizard/jester sounds</p>
        </div>
      </div>
      <MedievalToggle enabled={chaosMode} onClick={onToggle} />
    </div>
  );
}

export function SoundSection({ settings, wizardSound, jesterSound, trickWinSound, sharedCustomSounds, onToggleSound, onToggleChaosMode, onVolumeChange, onWizardSoundChange, onJesterSoundChange, onTrickWinSoundChange, onPreviewSound, onPreviewCustomSound, onImportSharedSound, importedSharedSoundIds }: SoundSectionProps) {
  return (
    <section>
      <SectionHeader />
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded border border-amber-800/30" style={{ background: THEME_SURFACE.CARD_BG }}>
          <span className="text-amber-200/80" style={{ fontFamily: "Georgia, serif" }}>Sound Effects</span>
          <MedievalToggle enabled={settings.enabled} onClick={onToggleSound} />
        </div>
        {settings.enabled ? <VolumeSlider volume={settings.volume} onVolumeChange={onVolumeChange} /> : null}
        <SoundPicker title="Wizard Sound" icon={Wand2} presets={WIZARD_SOUND_PRESETS} selected={wizardSound} onSelect={onWizardSoundChange} onPreview={(id) => onPreviewSound(id as SoundName)} />
        <SoundPicker title="Jester Sound" icon={Drama} presets={JESTER_SOUND_PRESETS} selected={jesterSound} onSelect={onJesterSoundChange} onPreview={(id) => onPreviewSound(id as SoundName)} />
        <SoundPicker title="Trick Win Sound" icon={Trophy} presets={TRICK_WIN_SOUND_PRESETS} selected={trickWinSound} onSelect={onTrickWinSoundChange} onPreview={(id) => onPreviewSound(id as SoundName)} />
        <SharedSoundPicker sounds={sharedCustomSounds} onPreview={onPreviewCustomSound} onImport={onImportSharedSound} importedSoundIds={importedSharedSoundIds} />
        <ChaosModeToggle chaosMode={settings.chaosMode} onToggle={onToggleChaosMode} />
      </div>
    </section>
  );
}
