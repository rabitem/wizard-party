import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { AVATAR_PRESETS } from '@/presentation/components/settings/avatar-presets';

import { AVATAR_GLYPHS } from './player-pair-card';

/** Presets whose rpg-awesome icon is missing from the bundled font; the card falls back to the wizard. */
const WITHOUT_GLYPH = new Set(['bat']);

describe('player pair card avatar glyphs', () => {
  it('should cover every avatar preset, so new presets are not silently drawn as the fallback', () => {
    const missing = AVATAR_PRESETS.map((preset) => preset.id).filter((id) => !(id in AVATAR_GLYPHS) && !WITHOUT_GLYPH.has(id));
    expect(missing).toEqual([]);
  });
});
