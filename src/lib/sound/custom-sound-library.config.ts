import { CUSTOM_AUDIO_MAX_FILE_SIZE_BYTES } from '@shared/domain';

const MIB = 1024 * 1024;

/**
 * Device-local storage of uploaded custom sound audio. The audio lives in IndexedDB (no 5 MB
 * Web Storage budget); the settings blob in localStorage keeps only each sound's metadata.
 */
export const CUSTOM_SOUND_LIBRARY_CONFIG = {
  DATABASE_NAME: 'wizard-party-audio',
  STORE_NAME: 'custom-sounds',
  /** Per sound: the upload limit every client and the account server enforce. */
  MAX_SOUND_BYTES: CUSTOM_AUDIO_MAX_FILE_SIZE_BYTES,
  /** All custom sounds on this device together (file bytes; stored base64 is about 4/3 of it). */
  MAX_TOTAL_BYTES: 24 * MIB,
  MAX_TOTAL_MB: 24,
} as const;

/** True when adding `addedBytes` of audio would push the device's custom sounds over the total cap. */
export function exceedsCustomSoundLibraryCap(sounds: ReadonlyArray<{ size: number }>, addedBytes: number): boolean {
  const used = sounds.reduce((total, sound) => total + (Number.isFinite(sound.size) ? sound.size : 0), 0);
  return used + addedBytes > CUSTOM_SOUND_LIBRARY_CONFIG.MAX_TOTAL_BYTES;
}
