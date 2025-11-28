'use client';

import { Volume2, Music } from 'lucide-react';
import type { SoundSettings } from '@/lib/sounds';

interface SoundSectionProps {
  settings: SoundSettings;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  onVolumeChange: (volume: number) => void;
  onMusicVolumeChange: (volume: number) => void;
}

export function SoundSection({
  settings,
  onToggleSound,
  onToggleMusic,
  onVolumeChange,
  onMusicVolumeChange,
}: SoundSectionProps) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-xs font-medium text-amber-400/60 uppercase tracking-widest mb-4">
        <Volume2 className="w-4 h-4" />
        Sound
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#0a0a15]/50 border border-amber-500/10">
          <span className="text-amber-100">Sound Effects</span>
          <button
            onClick={onToggleSound}
            className={`relative w-12 h-6 rounded-full transition-all cursor-pointer ${
              settings.enabled
                ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                : 'bg-[#15152a] border border-amber-500/20'
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-md ${
                settings.enabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {settings.enabled && (
          <div className="px-3">
            <label className="text-sm text-amber-400/60">Volume</label>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.volume * 100}
              onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
              className="w-full h-2 bg-[#15152a] rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        )}

        <div className="flex items-center justify-between p-3 rounded-xl bg-[#0a0a15]/50 border border-amber-500/10">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-amber-400/60" />
            <span className="text-amber-100">Background Music</span>
          </div>
          <button
            onClick={onToggleMusic}
            className={`relative w-12 h-6 rounded-full transition-all cursor-pointer ${
              settings.musicEnabled
                ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                : 'bg-[#15152a] border border-amber-500/20'
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-md ${
                settings.musicEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {settings.musicEnabled && (
          <div className="px-3">
            <label className="text-sm text-amber-400/60">Music Volume</label>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.musicVolume * 100}
              onChange={(e) => onMusicVolumeChange(Number(e.target.value) / 100)}
              className="w-full h-2 bg-[#15152a] rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        )}
      </div>
    </section>
  );
}
