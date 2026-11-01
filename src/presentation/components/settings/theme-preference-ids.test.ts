import { describe, expect, it } from 'vitest';
import { THEME_PREFERENCE_IDS } from './settings-persistence';
import { THEME_PRESETS } from './visual-presets';

describe('UI theme ids', () => {
  it('should offer exactly one preset for every saved theme preference', () => {
    const presetIds = THEME_PRESETS.map((preset) => preset.id);
    expect(new Set(presetIds).size).toBe(presetIds.length);
    expect([...presetIds].sort()).toEqual([...THEME_PREFERENCE_IDS].sort());
  });
});
