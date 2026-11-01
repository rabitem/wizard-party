const MIB = 1024 * 1024;

/** Tunables of the Web Audio engine (context lifecycle, file playback, synthesis). */
export const AUDIO_ENGINE_CONFIG = {
  /**
   * Gestures that may unlock audio. Per the HTML spec only these are activation-triggering on
   * touch devices: pointerdown and touchstart are not, so resume() there is rejected on iOS.
   */
  UNLOCK_EVENTS: ['pointerup', 'touchend', 'click', 'keydown'] as const,
  /** Decoded audio files kept for instant replay (AudioBuffers are float32 PCM: ~0.4 MB per stereo second). */
  MAX_DECODED_BYTES: 48 * MIB,
  /** A file whose first decode takes longer than this is not played late: the moment has passed. */
  MAX_FIRST_PLAY_DELAY_MS: 1500,
  /** Pre-generated noise buffers per (noise type, duration), rotated so repeats do not sound identical. */
  NOISE_VARIANTS: 3,
} as const;
