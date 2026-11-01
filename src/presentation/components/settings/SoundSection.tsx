"use client";

import type { SoundSettings } from "@/lib/sounds";
import { Music, Skull, Volume2 } from "lucide-react";
import { MedievalToggle } from "./MedievalToggle";
import { SOUND_PACKS, findSoundPack, type SoundPack, type SoundPackSounds } from "./sound-packs";
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface SoundSectionProps {
  settings: SoundSettings;
  sounds: SoundPackSounds;
  onToggleSound: () => void;
  onToggleChaosMode: () => void;
  onVolumeChange: (volume: number) => void;
  onSelectPack: (pack: SoundPack) => void;
}

/** Section header with icon and dividers */
function SectionHeader() {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/30" />
      <Volume2 className="w-4 h-4 text-amber-500/60" />
      <span className="text-xs text-amber-400/70 uppercase tracking-widest font-serif">Sound</span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/30" />
    </div>
  );
}

/** Volume slider control */
function VolumeSlider({ volume, onVolumeChange }: { volume: number; onVolumeChange: (v: number) => void }) {
  return (
    <div className="px-3 py-2">
      <label className="text-sm text-amber-500/60 font-serif">Volume</label>
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
          <span className={chaosMode ? "text-red-300" : "text-amber-200/80"} style={{ fontFamily: 'var(--font-serif)' }}>Chaos Mode</span>
          <p className="text-xs text-amber-600/50 font-serif">Extra loud wizard/jester sounds</p>
        </div>
      </div>
      <MedievalToggle enabled={chaosMode} onClick={onToggle} label="Chaos mode" />
    </div>
  );
}

/** One tap sets the Wizard, Jester and trick-win sound together; single picks live in Preferences. */
function SoundPackPicker({ sounds, onSelect }: { sounds: SoundPackSounds; onSelect: (pack: SoundPack) => void }) {
  const current = findSoundPack(sounds);
  return (
    <div className="p-3 rounded border border-amber-800/30" style={{ background: THEME_SURFACE.CARD_BG }}>
      <div className="flex items-center gap-2 mb-3">
        <Music className="w-4 h-4 text-amber-500/60 flex-shrink-0" />
        <span className="text-amber-200/80 text-sm flex-1 font-serif">Sound Pack</span>
        {current ? null : <span className="text-xs text-amber-500/60 font-serif">Your own mix</span>}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {SOUND_PACKS.map((pack) => {
          const selected = current?.id === pack.id;
          return (
            <button
              key={pack.id}
              type="button"
              onClick={() => onSelect(pack)}
              aria-pressed={selected}
              className={`p-2 rounded border text-center transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 ${selected ? "border-amber-500 bg-amber-900/30" : "border-amber-800/30 hover:border-amber-700/50 hover:bg-amber-900/20"}`}
            >
              <div className="text-lg leading-none mb-1" aria-hidden>{pack.icon}</div>
              <div className={`font-serif text-xs ${selected ? "text-amber-300" : "text-amber-400/70"}`}>{pack.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The in-game sound controls: on/off, volume, pack and chaos mode. */
export function SoundSection({ settings, sounds, onToggleSound, onToggleChaosMode, onVolumeChange, onSelectPack }: SoundSectionProps) {
  return (
    <section>
      <SectionHeader />
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded border border-amber-800/30" style={{ background: THEME_SURFACE.CARD_BG }}>
          <span className="text-amber-200/80 font-serif">Sound Effects</span>
          <MedievalToggle enabled={settings.enabled} onClick={onToggleSound} label="Sound effects" />
        </div>
        {settings.enabled ? <VolumeSlider volume={settings.volume} onVolumeChange={onVolumeChange} /> : null}
        <SoundPackPicker sounds={sounds} onSelect={onSelectPack} />
        <ChaosModeToggle chaosMode={settings.chaosMode} onToggle={onToggleChaosMode} />
      </div>
    </section>
  );
}
