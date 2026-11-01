'use client';

import { AlertTriangle, Check, Clock, Drama, Music, Play, Trash2, Trophy, Upload, Users, Wand2, X } from 'lucide-react';
import { useRef, useState, useCallback, useEffect } from 'react';
import { SOUND_CATEGORY_IDS, type SoundCategory } from '@shared/domain';
import {
  ALLOWED_FORMATS_DISPLAY,
  MAX_DURATION_SECONDS,
  MAX_FILE_SIZE_MB,
  formatFileSize,
} from '@/lib/sound';
import { useStorageQuotaExceeded } from '@/presentation/hooks/useStorageQuotaExceeded';
import {
  removeCustomAudio,
  renameCustomAudio,
  setCustomAudioCategory,
  setCustomAudioRole,
  type CustomAudio,
  type CustomSoundsChangeReason,
} from './custom-audio-edits';
import { SOUND_CATEGORY_LABELS } from './sound-presets';
import type { CustomAudioRole } from './settings-persistence';
import { useCustomAudioUpload } from './useCustomAudioUpload';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

export type { AudioValidationResult } from '@/lib/sound';
export type { CustomAudio, CustomSoundsChangeReason } from './custom-audio-edits';

const STORAGE_FULL_MESSAGE = 'This browser\'s storage is full, so your latest settings are only kept until you close '
  + 'this tab. Remove a custom sound to free space.';

interface AudioUploadSectionProps {
  customSounds: CustomAudio[];
  onCustomSoundsChange: (sounds: CustomAudio[], reason: CustomSoundsChangeReason) => void;
  previewVolume?: number;
}

export interface AudioPreviewElement {
  volume: number;
  currentTime: number;
  play: () => Promise<void>;
  pause: () => void;
  addEventListener: (type: 'ended', listener: () => void) => void;
}

export interface CustomAudioPreview {
  audio: AudioPreviewElement;
  playPromise: Promise<void>;
}

const ROLE_OPTIONS: Array<{
  id: CustomAudioRole;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'wizard', label: 'Wizard', Icon: Wand2 },
  { id: 'jester', label: 'Jester', Icon: Drama },
  { id: 'trick', label: 'Trick', Icon: Trophy },
  { id: 'afk', label: 'Board', Icon: Clock },
  { id: 'shared', label: 'Share', Icon: Users },
];

function clampPreviewVolume(volume: number): number {
  if (!Number.isFinite(volume)) return 1;
  return Math.max(0, Math.min(1, volume));
}

export function startCustomAudioPreview({
  dataUrl,
  volume,
  onEnded,
  onError,
}: {
  dataUrl: string;
  volume: number;
  onEnded: () => void;
  onError: (error: unknown) => void;
}): CustomAudioPreview {
  const audio: AudioPreviewElement = new Audio(dataUrl);
  audio.volume = clampPreviewVolume(volume);
  audio.addEventListener('ended', onEnded);
  const playPromise = audio.play().catch((error) => {
    onError(error);
    onEnded();
  });
  return { audio, playPromise };
}

export function stopCustomAudioPreview(audio: AudioPreviewElement | null): void {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
}

function SectionHeader() {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/30" />
      <Music className="w-4 h-4 text-amber-500/60" />
      <span className="text-xs text-amber-400/70 uppercase tracking-widest font-serif">Custom Sound Manager</span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/30" />
    </div>
  );
}

function UploadDropZone({ isDragging, isValidating, onDragOver, onDragLeave, onDrop, onClick }: {
  isDragging: boolean;
  isValidating: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: () => void;
}) {
  return (
    <div
      className={`relative p-4 rounded border-2 border-dashed transition-all cursor-pointer ${isDragging ? 'border-amber-500 bg-amber-900/20' : 'border-amber-800/40 hover:border-amber-700/50 hover:bg-amber-900/10'}`}
      style={{ background: isDragging ? 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-700) 15%, transparent) 0%, color-mix(in srgb, var(--color-amber-800) 10%, transparent) 100%)' : THEME_SURFACE.CARD_BG }}
      role="button"
      tabIndex={0}
      aria-label="Upload audio file"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <div className={`p-3 rounded-full ${isDragging ? 'bg-amber-800/30' : 'bg-amber-900/30'}`}>
          <Upload className={`w-6 h-6 ${isDragging ? 'text-amber-400' : 'text-amber-500/60'}`} />
        </div>
        <div>
          <p className="text-sm text-amber-200/80 font-serif">{isDragging ? 'Drop audio file here' : 'Add custom audio'}</p>
          <p className="text-xs text-amber-500/50 mt-1 font-serif">{ALLOWED_FORMATS_DISPLAY} - Max {MAX_FILE_SIZE_MB}MB - Max {MAX_DURATION_SECONDS}s</p>
        </div>
      </div>
      {isValidating ? <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded"><div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" /></div> : null}
    </div>
  );
}

function RoleCheckbox({ audio, role, label, Icon, onRoleChange }: {
  audio: CustomAudio;
  role: CustomAudioRole;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  onRoleChange: (id: string, role: CustomAudioRole, enabled: boolean) => void;
}) {
  const checked = audio.roles[role];
  return (
    <label className={`font-serif flex items-center gap-1.5 px-2 py-1.5 rounded border transition-colors cursor-pointer ${checked ? 'border-amber-500/60 bg-amber-900/30 text-amber-300' : 'border-amber-800/30 text-amber-500/60 hover:border-amber-700/50'}`}>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(event) => onRoleChange(audio.id, role, event.target.checked)}
      />
      <Icon className="w-3.5 h-3.5" />
      <span className="text-xs">{label}</span>
      {checked ? <Check className="w-3 h-3" /> : null}
    </label>
  );
}

function CustomAudioRow({ audio, isPlaying, onPreview, onRemove, onRename, onCategoryChange, onRoleChange }: {
  audio: CustomAudio;
  isPlaying: boolean;
  onPreview: (audio: CustomAudio) => void;
  onRemove: (audio: CustomAudio) => void;
  onRename: (id: string, name: string) => void;
  onCategoryChange: (id: string, category: SoundCategory) => void;
  onRoleChange: (id: string, role: CustomAudioRole, enabled: boolean) => void;
}) {
  return (
    <div className="p-3 rounded border border-amber-800/30" style={{ background: THEME_SURFACE.CARD_BG }}>
      <div className="flex items-start gap-3">
        <div className="relative p-2 rounded-full bg-amber-900/30 mt-0.5">
          <Music className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <input
            value={audio.name}
            onChange={(event) => onRename(audio.id, event.target.value)}
            aria-label="Custom sound name"
            className="w-full rounded border border-amber-800/30 bg-black/20 px-2 py-1 text-sm text-amber-100/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 font-serif"
          />
          <p className="text-xs text-amber-500/50 font-serif">{formatFileSize(audio.size)} - {audio.duration.toFixed(1)}s</p>
          <label className="flex items-center gap-2 text-xs text-amber-500/70 font-serif">
            <span>Category</span>
            <select
              value={audio.category}
              onChange={(event) => onCategoryChange(audio.id, event.target.value as SoundCategory)}
              className="min-w-0 rounded border border-amber-800/30 bg-black/20 px-2 py-1 text-xs text-amber-100/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
              aria-label={`${audio.name} category`}
            >
              {SOUND_CATEGORY_IDS.map((category) => (
                <option key={category} value={category}>{SOUND_CATEGORY_LABELS[category]}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map(({ id, label, Icon }) => (
              <RoleCheckbox key={id} audio={audio} role={id} label={label} Icon={Icon} onRoleChange={onRoleChange} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onPreview(audio)} className="p-2 rounded hover:bg-amber-800/30 transition-colors cursor-pointer" title={isPlaying ? 'Stop preview' : 'Preview sound'} type="button">
            {isPlaying ? <X className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-amber-500/60" />}
          </button>
          <button onClick={() => onRemove(audio)} className="p-2 rounded hover:bg-red-900/30 transition-colors cursor-pointer" title="Remove audio" type="button">
            <Trash2 className="w-4 h-4 text-red-400/60 hover:text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ValidationError({ error }: { error: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded border border-red-800/40" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-900) 40%, transparent) 0%, color-mix(in srgb, var(--surface) 40%, transparent) 100%)' }}>
      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-300/80 font-serif">{error}</p>
    </div>
  );
}

function useCustomAudioPreview({
  previewVolume,
  setValidationError,
}: {
  previewVolume: number;
  setValidationError: (error: string | null) => void;
}) {
  const audioPreviewRef = useRef<AudioPreviewElement | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  useEffect(() => () => {
    stopCustomAudioPreview(audioPreviewRef.current);
  }, []);

  const stopPreview = useCallback(() => {
    stopCustomAudioPreview(audioPreviewRef.current);
    audioPreviewRef.current = null;
    setPlayingAudioId(null);
  }, []);

  const handlePreview = useCallback((audio: CustomAudio) => {
    if (playingAudioId === audio.id && audioPreviewRef.current) {
      stopPreview();
      return;
    }

    stopPreview();
    setValidationError(null);
    const preview = startCustomAudioPreview({
      dataUrl: audio.dataUrl,
      volume: previewVolume,
      onEnded: () => setPlayingAudioId(null),
      onError: (error) => {
        console.warn('[Sound] Custom audio preview failed:', error);
        setValidationError('Could not play audio preview. Check browser audio permissions and try again.');
      },
    });
    audioPreviewRef.current = preview.audio;
    setPlayingAudioId(audio.id);
    void preview.playPromise;
  }, [playingAudioId, previewVolume, setValidationError, stopPreview]);

  const stopPreviewForAudio = useCallback((audio: CustomAudio) => {
    if (playingAudioId === audio.id) stopPreview();
  }, [playingAudioId, stopPreview]);

  return { playingAudioId, handlePreview, stopPreviewForAudio };
}

export function AudioUploadSection({ customSounds, onCustomSoundsChange, previewVolume = 1 }: AudioUploadSectionProps) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const {
    fileInputRef,
    isValidating,
    isDragging,
    handleInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleClick,
  } = useCustomAudioUpload({ customSounds, onCustomSoundsChange, setValidationError });
  const storageFull = useStorageQuotaExceeded();
  const {
    playingAudioId,
    handlePreview,
    stopPreviewForAudio,
  } = useCustomAudioPreview({ previewVolume, setValidationError });

  const handleRemove = useCallback((audio: CustomAudio) => {
    stopPreviewForAudio(audio);
    setValidationError(null);
    onCustomSoundsChange(removeCustomAudio(customSounds, audio.id), 'remove');
  }, [customSounds, onCustomSoundsChange, stopPreviewForAudio]);

  const handleRename = useCallback((id: string, name: string) => {
    onCustomSoundsChange(renameCustomAudio(customSounds, id, name), 'rename');
  }, [customSounds, onCustomSoundsChange]);

  const handleRoleChange = useCallback((id: string, role: CustomAudioRole, enabled: boolean) => {
    onCustomSoundsChange(setCustomAudioRole(customSounds, id, role, enabled), 'role');
  }, [customSounds, onCustomSoundsChange]);

  const handleCategoryChange = useCallback((id: string, category: SoundCategory) => {
    onCustomSoundsChange(setCustomAudioCategory(customSounds, id, category), 'category');
  }, [customSounds, onCustomSoundsChange]);

  return (
    <section>
      <SectionHeader />
      <div className="space-y-3">
        <input ref={fileInputRef} type="file" accept=".mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg" onChange={handleInputChange} className="hidden" />
        <UploadDropZone isDragging={isDragging} isValidating={isValidating} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={handleClick} />
        {customSounds.length > 0 ? (
          <div className="space-y-2">
            {customSounds.map((audio) => (
              <CustomAudioRow
                key={audio.id}
                audio={audio}
                isPlaying={playingAudioId === audio.id}
                onPreview={handlePreview}
                onRemove={handleRemove}
                onRename={handleRename}
                onCategoryChange={handleCategoryChange}
                onRoleChange={handleRoleChange}
              />
            ))}
          </div>
        ) : null}
        {validationError ? <ValidationError error={validationError} /> : null}
        {storageFull ? <ValidationError error={STORAGE_FULL_MESSAGE} /> : null}
      </div>
    </section>
  );
}
