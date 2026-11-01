'use client';

import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from 'react';

import { fileToDataUrl, getAudioDuration, validateAudioFile } from '@/lib/sound';
import { CUSTOM_SOUND_LIBRARY_CONFIG, exceedsCustomSoundLibraryCap } from '@/lib/sound/custom-sound-library.config';

import { createUploadedCustomAudio, type CustomAudio, type CustomSoundsChangeReason } from './custom-audio-edits';
import { storeCustomSoundAudio } from './settings-persistence';

const LIBRARY_FULL_MESSAGE = `Custom sounds on this device are limited to ${CUSTOM_SOUND_LIBRARY_CONFIG.MAX_TOTAL_MB}MB in total. `
  + 'Remove a sound to add another.';

function createDragHandlers(setIsDragging: (v: boolean) => void, handleFileSelect: (f: File) => void) {
  const handleDragOver = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) handleFileSelect(file); };
  return { handleDragOver, handleDragLeave, handleDrop };
}

/**
 * Upload of one audio file into the Custom Sound Manager: validation, the device-wide size cap,
 * and storing the audio in the device library (IndexedDB) before the settings are saved, so the
 * localStorage settings blob only ever holds a reference to it.
 */
export function useCustomAudioUpload({
  customSounds,
  onCustomSoundsChange,
  setValidationError,
}: {
  customSounds: CustomAudio[];
  onCustomSoundsChange: (sounds: CustomAudio[], reason: CustomSoundsChangeReason) => void;
  setValidationError: (error: string | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    setIsValidating(true);
    setValidationError(null);
    try {
      const validation = await validateAudioFile(file);
      if (!validation.valid) {
        setValidationError(validation.error ?? 'Invalid file');
        return;
      }
      if (exceedsCustomSoundLibraryCap(customSounds, file.size)) {
        setValidationError(LIBRARY_FULL_MESSAGE);
        return;
      }
      const duration = validation.details?.duration ?? await getAudioDuration(file);
      const audio = createUploadedCustomAudio(file, await fileToDataUrl(file), duration);
      // Where IndexedDB is unusable this resolves false and the audio is stored inline instead.
      await storeCustomSoundAudio(audio.id, audio.dataUrl);
      onCustomSoundsChange([...customSounds, audio], 'upload');
    } catch {
      setValidationError('Failed to process audio file');
    } finally {
      setIsValidating(false);
    }
  }, [customSounds, onCustomSoundsChange, setValidationError]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFileSelect(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const { handleDragOver, handleDragLeave, handleDrop } = createDragHandlers(setIsDragging, (file) => void handleFileSelect(file));
  const handleClick = () => fileInputRef.current?.click();

  return {
    fileInputRef,
    isValidating,
    isDragging,
    handleInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleClick,
  };
}
