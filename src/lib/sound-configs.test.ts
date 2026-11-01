import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  GAME_WIN_SOUNDS,
  JESTER_SOUNDS,
  ROUND_WIN_SOUNDS,
  TRICK_WIN_SOUNDS,
  WIZARD_SOUNDS,
} from './sounds';
import { SOUND_CONFIGS } from './sound-configs';

const publicDir = fileURLToPath(new URL('../../public', import.meta.url));
const publicSoundsDir = fileURLToPath(new URL('../../public/sounds', import.meta.url));

describe('sound configuration registry', () => {
  it('has configs for every selectable and random sound option', () => {
    const selectableSounds = [
      ...WIZARD_SOUNDS,
      ...JESTER_SOUNDS,
      ...TRICK_WIN_SOUNDS,
      ...ROUND_WIN_SOUNDS,
      ...GAME_WIN_SOUNDS,
    ];

    expect(selectableSounds).not.toHaveLength(0);
    for (const sound of selectableSounds) {
      expect(SOUND_CONFIGS[sound], sound).toBeDefined();
    }
  });

  it('only references audio files that exist in public/sounds', () => {
    for (const [sound, config] of Object.entries(SOUND_CONFIGS)) {
      if (!config.audioFile) continue;

      expect(config.audioFile, sound).toMatch(/^\/sounds\/.+\.mp3$/);
      expect(existsSync(`${publicDir}${config.audioFile}`), `${sound}: ${config.audioFile}`).toBe(true);
    }
  });

  it('keeps every bundled public sound asset reachable from the registry', () => {
    const referencedFiles = new Set(
      Object.values(SOUND_CONFIGS)
        .map((config) => config.audioFile)
        .filter((file): file is string => typeof file === 'string')
        .map((file) => file.replace('/sounds/', ''))
    );
    const publicFiles = readdirSync(publicSoundsDir).filter((file) => file.endsWith('.mp3'));

    for (const file of publicFiles) {
      expect(referencedFiles.has(file), file).toBe(true);
    }
  });

  it('keeps base audio-file volumes in the safe HTMLAudioElement range', () => {
    for (const [sound, config] of Object.entries(SOUND_CONFIGS)) {
      if (!config.audioFile || config.audioVolume === undefined) continue;

      expect(config.audioVolume, sound).toBeGreaterThan(0);
      expect(config.audioVolume, sound).toBeLessThanOrEqual(1);
    }
  });
});
