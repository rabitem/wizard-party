import { describe, expect, it } from 'vitest';

import { SOUND_PACKS, findSoundPack } from './sound-packs';

const soundKey = ({ wizardSound, jesterSound, trickWinSound }: (typeof SOUND_PACKS)[number]['sounds']) =>
  `${wizardSound}|${jesterSound}|${trickWinSound}`;

describe('sound packs', () => {
  it('should give every pack its own combination, so the selected pack is never ambiguous', () => {
    expect(new Set(SOUND_PACKS.map((pack) => soundKey(pack.sounds))).size).toBe(SOUND_PACKS.length);
  });

  it('should find the pack whose three sounds match', () => {
    const [, pack] = SOUND_PACKS;
    expect(findSoundPack({ ...pack.sounds })?.id).toBe(pack.id);
  });

  it('should report a mix when only some sounds match a pack', () => {
    const [, pack] = SOUND_PACKS;
    expect(findSoundPack({ ...pack.sounds, jesterSound: 'random' })).toBeNull();
  });
});
