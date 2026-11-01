import { describe, expect, it } from 'vitest';

import {
  removeCustomAudio,
  renameCustomAudio,
  setCustomAudioCategory,
  setCustomAudioRole,
  type CustomAudio,
} from './custom-audio-edits';

const ORIGINAL: CustomAudio = {
  id: 'custom-1',
  name: 'Original',
  dataUrl: 'data:audio/wav;base64,AAAA',
  size: 128,
  duration: 1,
  category: 'custom',
  roles: { wizard: false, jester: false, trick: true, afk: false, shared: false },
};

const OTHER: CustomAudio = { ...ORIGINAL, id: 'custom-2', name: 'Other' };

const SOUNDS: CustomAudio[] = [ORIGINAL, OTHER];

describe('custom audio list edits', () => {
  it.each<{ edit: string; apply: (sounds: CustomAudio[]) => CustomAudio[]; expected: CustomAudio[] }>([
    {
      edit: 'rename one sound and keep its other fields',
      apply: (sounds) => renameCustomAudio(sounds, 'custom-1', 'New name'),
      expected: [{ ...ORIGINAL, name: 'New name' }, OTHER],
    },
    {
      edit: 'name a sound renamed to blanks "Custom sound"',
      apply: (sounds) => renameCustomAudio(sounds, 'custom-1', '   '),
      expected: [{ ...ORIGINAL, name: 'Custom sound' }, OTHER],
    },
    {
      edit: 'turn on the wizard role only',
      apply: (sounds) => setCustomAudioRole(sounds, 'custom-1', 'wizard', true),
      expected: [{ ...ORIGINAL, roles: { ...ORIGINAL.roles, wizard: true } }, OTHER],
    },
    {
      edit: 'share a sound with the table',
      apply: (sounds) => setCustomAudioRole(sounds, 'custom-1', 'shared', true),
      expected: [{ ...ORIGINAL, roles: { ...ORIGINAL.roles, shared: true } }, OTHER],
    },
    {
      edit: 'put a sound on the timeout board',
      apply: (sounds) => setCustomAudioRole(sounds, 'custom-1', 'afk', true),
      expected: [{ ...ORIGINAL, roles: { ...ORIGINAL.roles, afk: true } }, OTHER],
    },
    {
      edit: 'change the category without touching roles',
      apply: (sounds) => setCustomAudioCategory(sounds, 'custom-1', 'football'),
      expected: [{ ...ORIGINAL, category: 'football' }, OTHER],
    },
    {
      edit: 'remove one sound by id',
      apply: (sounds) => removeCustomAudio(sounds, 'custom-1'),
      expected: [OTHER],
    },
  ])('should $edit', ({ apply, expected }) => {
    const before = structuredClone(SOUNDS);

    expect(apply(SOUNDS)).toEqual(expected);
    expect(SOUNDS).toEqual(before);
  });
});
