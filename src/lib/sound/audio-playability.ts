import type { AudioValidationConfig, AudioValidationResult } from './audio-validation.shared';

const DEFAULT_AUDIO_LOAD_TIMEOUT_MS = 10000;
const AUDIO_PLAYABLE_ERROR =
  'This audio file cannot be played by this browser. Try re-exporting it as a standard MP3, WAV, or OGG file.';
const AUDIO_EXTENSION_MIME_TYPES: Record<string, readonly string[]> = {
  '.mp3': ['audio/mpeg', 'audio/mp3'],
  '.wav': ['audio/wav', 'audio/wave', 'audio/x-wav'],
  '.ogg': ['audio/ogg'],
};

/**
 * Validates that the current browser can decode enough of the audio to play it.
 * This intentionally does not call play(), because autoplay policies can reject
 * otherwise valid audio outside a direct user gesture.
 */
export async function validateAudioPlayable(
  file: File,
  config?: Pick<AudioValidationConfig, 'audioLoadTimeoutMs' | 'createAudioElement'>
): Promise<AudioValidationResult> {
  try {
    await waitForPlayableAudio(file, config);
    return {
      valid: true,
      details: {
        playable: true,
      },
    };
  } catch {
    return {
      valid: false,
      error: AUDIO_PLAYABLE_ERROR,
      details: {
        playable: false,
      },
    };
  }
}

function waitForPlayableAudio(
  file: File,
  config?: Pick<AudioValidationConfig, 'audioLoadTimeoutMs' | 'createAudioElement'>
): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = createAudioElement(config);

    if (!browserSupportsAudioFile(audio, file)) {
      reject(new Error('Audio type is not playable by this browser'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    let settled = false;

    const cleanup = () => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(objectUrl);
      audio.removeEventListener('canplay', handlePlayable);
      audio.removeEventListener('canplaythrough', handlePlayable);
      audio.removeEventListener('error', handleError);
    };

    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };

    const handlePlayable = () => settle(resolve);
    const handleError = () => settle(() => reject(new Error('Failed to decode audio for playback')));

    audio.addEventListener('canplay', handlePlayable);
    audio.addEventListener('canplaythrough', handlePlayable);
    audio.addEventListener('error', handleError);

    const timeoutId = setTimeout(() => {
      settle(() => reject(new Error('Audio playability check timed out')));
    }, getAudioLoadTimeoutMs(config));

    audio.preload = 'auto';
    audio.muted = true;
    audio.src = objectUrl;
    audio.load();
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
  return config?.audioLoadTimeoutMs ?? DEFAULT_AUDIO_LOAD_TIMEOUT_MS;
}

function browserSupportsAudioFile(audio: HTMLAudioElement, file: File): boolean {
  if (typeof audio.canPlayType !== 'function') return true;

  const mimeTypeCandidates = getAudioMimeTypeCandidates(file);
  if (mimeTypeCandidates.length === 0) return true;

  return mimeTypeCandidates.some((mimeType) => {
    const support = audio.canPlayType(mimeType);
    return support === 'maybe' || support === 'probably';
  });
}

function getAudioMimeTypeCandidates(file: File): string[] {
  const mimeType = file.type.toLowerCase();
  const extension = getFileExtension(file.name);
  const fallbackMimeTypes = AUDIO_EXTENSION_MIME_TYPES[extension] ?? [];
  return Array.from(new Set([mimeType, ...fallbackMimeTypes].filter(Boolean)));
}

function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return '';
  }
  return filename.slice(lastDotIndex).toLowerCase();
}
