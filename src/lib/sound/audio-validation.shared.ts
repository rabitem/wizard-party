import {
  CUSTOM_AUDIO_MAX_DURATION_SECONDS,
  CUSTOM_AUDIO_MAX_FILE_SIZE_BYTES,
  CUSTOM_AUDIO_MAX_FILE_SIZE_MB,
  CUSTOM_AUDIO_MIN_DURATION_SECONDS,
} from '@shared/domain';

export const MAX_FILE_SIZE_BYTES = CUSTOM_AUDIO_MAX_FILE_SIZE_BYTES;
export const MAX_FILE_SIZE_MB = CUSTOM_AUDIO_MAX_FILE_SIZE_MB;
export const MAX_DURATION_SECONDS = CUSTOM_AUDIO_MAX_DURATION_SECONDS;
export const MIN_DURATION_SECONDS = CUSTOM_AUDIO_MIN_DURATION_SECONDS;

export const ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
] as const;

export const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.ogg'] as const;
export const ALLOWED_FORMATS_DISPLAY = 'MP3, WAV, or OGG';
export const AUDIO_LOAD_TIMEOUT_MS = 10000;

export interface AudioValidationResult {
  valid: boolean;
  error?: string;
  details?: {
    fileSize?: number;
    duration?: number;
    mimeType?: string;
    extension?: string;
    playable?: boolean;
  };
}

export interface AudioValidationConfig {
  maxSizeBytes?: number;
  maxDurationSeconds?: number;
  minDurationSeconds?: number;
  allowedMimeTypes?: readonly string[];
  allowedExtensions?: readonly string[];
  audioLoadTimeoutMs?: number;
  createAudioElement?: () => HTMLAudioElement;
}

export enum AudioValidationErrorType {
  INVALID_FORMAT = 'INVALID_FORMAT',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  DURATION_TOO_LONG = 'DURATION_TOO_LONG',
  DURATION_TOO_SHORT = 'DURATION_TOO_SHORT',
  CORRUPTED_FILE = 'CORRUPTED_FILE',
  UNPLAYABLE_AUDIO = 'UNPLAYABLE_AUDIO',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AudioValidationError {
  type: AudioValidationErrorType;
  message: string;
  details?: Record<string, unknown>;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return '';
  }
  return filename.slice(lastDotIndex).toLowerCase();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toFixed(0).padStart(2, '0')}`;
}

export function createValidationError(
  type: AudioValidationErrorType,
  message: string,
  details?: Record<string, unknown>
): AudioValidationError {
  return { type, message, details };
}

export function isAudioFile(file: File): boolean {
  const extension = getFileExtension(file.name);
  return (
    ALLOWED_EXTENSIONS.includes(extension as typeof ALLOWED_EXTENSIONS[number]) ||
    ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])
  );
}
