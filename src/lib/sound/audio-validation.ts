import {
  ALLOWED_EXTENSIONS,
  ALLOWED_FORMATS_DISPLAY,
  ALLOWED_MIME_TYPES,
  AUDIO_LOAD_TIMEOUT_MS,
  MAX_DURATION_SECONDS,
  MAX_FILE_SIZE_BYTES,
  MIN_DURATION_SECONDS,
  formatFileSize,
  getFileExtension,
  type AudioValidationConfig,
  type AudioValidationResult,
} from './audio-validation.shared';
import { validateAudioPlayable } from './audio-playability';

export { validateAudioPlayable } from './audio-playability';
export {
  ALLOWED_EXTENSIONS,
  ALLOWED_FORMATS_DISPLAY,
  ALLOWED_MIME_TYPES,
  AUDIO_LOAD_TIMEOUT_MS,
  MAX_DURATION_SECONDS,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  MIN_DURATION_SECONDS,
  AudioValidationErrorType,
  createValidationError,
  fileToDataUrl,
  formatDuration,
  formatFileSize,
  getFileExtension,
  isAudioFile,
  type AudioValidationConfig,
  type AudioValidationError,
  type AudioValidationResult,
} from './audio-validation.shared';

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates the audio file format by checking MIME type and extension
 */
export function validateAudioFormat(
  file: File,
  config?: Pick<AudioValidationConfig, 'allowedMimeTypes' | 'allowedExtensions'>
): AudioValidationResult {
  const allowedMimeTypes = config?.allowedMimeTypes ?? ALLOWED_MIME_TYPES;
  const allowedExtensions = config?.allowedExtensions ?? ALLOWED_EXTENSIONS;

  const mimeType = file.type.toLowerCase();
  const extension = getFileExtension(file.name);

  // Check MIME type first
  const isMimeTypeValid = allowedMimeTypes.includes(mimeType);

  // If MIME type is invalid or empty, fall back to extension check
  if (!isMimeTypeValid) {
    const isExtensionValid = allowedExtensions.includes(extension as typeof ALLOWED_EXTENSIONS[number]);

    if (!isExtensionValid) {
      return {
        valid: false,
        error: `Invalid format. Accepted formats: ${ALLOWED_FORMATS_DISPLAY}`,
        details: {
          mimeType,
          extension,
        },
      };
    }
  }

  return {
    valid: true,
    details: {
      mimeType,
      extension,
    },
  };
}

/**
 * Validates the audio file size
 */
export function validateAudioSize(
  file: File,
  config?: Pick<AudioValidationConfig, 'maxSizeBytes'>
): AudioValidationResult {
  const maxSize = config?.maxSizeBytes ?? MAX_FILE_SIZE_BYTES;

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${formatFileSize(maxSize)} (your file: ${formatFileSize(file.size)})`,
      details: {
        fileSize: file.size,
      },
    };
  }

  return {
    valid: true,
    details: {
      fileSize: file.size,
    },
  };
}

/**
 * Validates the audio duration by loading the file
 * Note: This is async as it requires decoding the audio
 */
async function validateAudioDuration(
  file: File,
  config?: Pick<AudioValidationConfig, 'maxDurationSeconds' | 'minDurationSeconds' | 'audioLoadTimeoutMs' | 'createAudioElement'>
): Promise<AudioValidationResult> {
  const maxDuration = config?.maxDurationSeconds ?? MAX_DURATION_SECONDS;
  const minDuration = config?.minDurationSeconds ?? MIN_DURATION_SECONDS;

  try {
    const duration = await getAudioDuration(file, config);

    if (!Number.isFinite(duration)) {
      return {
        valid: false,
        error: 'Could not read audio file. The file may be corrupted or in an unsupported format.',
        details: {
          duration,
        },
      };
    }

    if (duration > maxDuration) {
      return {
        valid: false,
        error: `Audio too long. Maximum duration: ${maxDuration}s (your file: ${duration.toFixed(1)}s)`,
        details: {
          duration,
        },
      };
    }

    if (duration < minDuration) {
      return {
        valid: false,
        error: `Audio too short. Minimum duration: ${minDuration}s`,
        details: {
          duration,
        },
      };
    }

    return {
      valid: true,
      details: {
        duration,
      },
    };
  } catch {
    return {
      valid: false,
      error: 'Could not read audio file. The file may be corrupted or in an unsupported format.',
    };
  }
}

/**
 * Validates an audio file comprehensively (format, size, duration, and playability)
 * This is the main validation function that should be used for full validation
 */
export async function validateAudioFile(
  file: File,
  config?: AudioValidationConfig
): Promise<AudioValidationResult> {
  // Step 1: Validate format (synchronous, cheap)
  const formatResult = validateAudioFormat(file, config);
  if (!formatResult.valid) {
    return formatResult;
  }

  // Step 2: Validate size (synchronous, cheap)
  const sizeResult = validateAudioSize(file, config);
  if (!sizeResult.valid) {
    return sizeResult;
  }

  // Step 3: Validate duration (async, requires audio decoding)
  const durationResult = await validateAudioDuration(file, config);
  if (!durationResult.valid) {
    return durationResult;
  }

  // Step 4: Validate browser playability (async, checks local browser decoder support)
  const playableResult = await validateAudioPlayable(file, config);
  if (!playableResult.valid) {
    return playableResult;
  }

  // All validations passed
  return {
    valid: true,
    details: {
      ...formatResult.details,
      ...sizeResult.details,
      ...durationResult.details,
      ...playableResult.details,
    },
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Gets the duration of an audio file in seconds
 */
export function getAudioDuration(
  file: File,
  config?: Pick<AudioValidationConfig, 'audioLoadTimeoutMs' | 'createAudioElement'>
): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = createAudioElement(config);
    const objectUrl = URL.createObjectURL(file);
    let settled = false;

    const cleanup = () => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(objectUrl);
      audio.removeEventListener('loadedmetadata', handleLoad);
      audio.removeEventListener('error', handleError);
    };

    const handleLoad = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(audio.duration);
    };

    const handleError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Failed to load audio file'));
    };

    audio.addEventListener('loadedmetadata', handleLoad);
    audio.addEventListener('error', handleError);

    // Timeout after 10 seconds to prevent hanging
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Audio loading timed out'));
    }, getAudioLoadTimeoutMs(config));

    audio.preload = 'metadata';
    audio.src = objectUrl;
  });
}

function createAudioElement(
  config?: Pick<AudioValidationConfig, 'createAudioElement'>
): HTMLAudioElement {
  return config?.createAudioElement?.() ?? new Audio();
}

function getAudioLoadTimeoutMs(
  config?: Pick<AudioValidationConfig, 'audioLoadTimeoutMs'>
): number {
  return config?.audioLoadTimeoutMs ?? AUDIO_LOAD_TIMEOUT_MS;
}
