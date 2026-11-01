/**
 * Sound Module
 * Exports all sound-related services following SRP
 */

export { AudioContextService, type AudioEngineState } from './audio-context.service';
export { AudioFilePlayer } from './audio-file-player';
export { installAudioUnlock, browserAudioUnlockEnvironment } from './audio-unlock';
export { NoiseBufferCache, type NoiseType } from './noise-buffer-cache';
export {
  SoundSettingsService,
  type SoundSettings,
  DEFAULT_SETTINGS,
} from './sound-settings.service';
export {
  SoundSynthesizerService,
  type ToneConfig,
  type NoiseConfig,
  type NoteSequenceConfig,
  type SoundEnvelope,
  type SoundFilter,
} from './sound-synthesizer.service';
export {
  // Constants
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  MAX_DURATION_SECONDS,
  MIN_DURATION_SECONDS,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  ALLOWED_FORMATS_DISPLAY,
  // Types
  type AudioValidationResult,
  type AudioValidationConfig,
  type AudioValidationError,
  AudioValidationErrorType,
  // Validation Functions
  validateAudioFormat,
  validateAudioSize,
  validateAudioFile,
  // Utility Functions
  getAudioDuration,
  fileToDataUrl,
  getFileExtension,
  formatFileSize,
  formatDuration,
  createValidationError,
  isAudioFile,
} from './audio-validation';
export { validateAudioPlayable } from './audio-playability';
export {
  CustomSoundAudioLibrary,
  customSoundAudioLibrary,
  type CustomSoundAudioRecord,
  type CustomSoundAudioLibraryState,
} from './custom-sound-audio-library';
export { CUSTOM_SOUND_LIBRARY_CONFIG, exceedsCustomSoundLibraryCap } from './custom-sound-library.config';
