import { describe, expect, it } from 'vitest';

import {
  JESTER_SOUNDS,
  TRICK_WIN_SOUNDS,
  WIZARD_SOUNDS,
  isSoundName,
} from '@/lib/sounds';
import {
  JESTER_SOUND_PRESETS,
  SOUND_CATEGORY_LABELS,
  TRICK_WIN_SOUND_PRESETS,
  WIZARD_SOUND_PRESETS,
  getSoundPresetCategory,
  type SoundPreset,
} from './sound-presets';

function expectPresetIdsInPool<T extends string>(
  presets: SoundPreset<T>[],
  pool: readonly string[]
): void {
  const seen = new Set<string>();

  for (const preset of presets) {
    expect(seen.has(preset.id), preset.id).toBe(false);
    seen.add(preset.id);

    if (preset.id === 'random') continue;
    expect(isSoundName(preset.id), preset.id).toBe(true);
    expect(pool.includes(preset.id), preset.id).toBe(true);
  }
}

describe('sound setting presets', () => {
  it('only exposes playable sounds from the correct category', () => {
    expectPresetIdsInPool(WIZARD_SOUND_PRESETS, WIZARD_SOUNDS);
    expectPresetIdsInPool(JESTER_SOUND_PRESETS, JESTER_SOUNDS);
    expectPresetIdsInPool(TRICK_WIN_SOUND_PRESETS, TRICK_WIN_SOUNDS);
  });

  it('assigns every preset to a known sound category', () => {
    const presets = [
      ...WIZARD_SOUND_PRESETS,
      ...JESTER_SOUND_PRESETS,
      ...TRICK_WIN_SOUND_PRESETS,
    ];

    for (const preset of presets) {
      expect(SOUND_CATEGORY_LABELS[getSoundPresetCategory(preset)], preset.id).toBeTruthy();
    }
  });
});
