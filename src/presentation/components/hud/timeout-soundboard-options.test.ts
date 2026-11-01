import { describe, expect, it } from 'vitest';

import {
  buildTimeoutSoundboardOptions,
  getTimeoutSoundCommand,
} from './timeout-soundboard-options';

describe('timeout soundboard options', () => {
  it('adds local and shared AFK custom sounds to the board', () => {
    const localSound = {
      id: 'local-afk',
      name: 'Local buzzer',
      dataUrl: 'data:audio/wav;base64,AAAA',
      size: 128,
      duration: 1,
      category: 'custom' as const,
      roles: { wizard: false, jester: false, trick: false, afk: true, shared: false },
    };
    const sharedSound = {
      id: 'shared-afk',
      ownerId: 'player-2',
      ownerName: 'Morgana',
      name: 'Shared bell',
      dataUrl: 'data:audio/wav;base64,BBBB',
      size: 128,
      duration: 1,
      category: 'meme' as const,
      roles: { wizard: false, jester: false, trick: false, afk: true, shared: true },
    };
    const localOnlyNonAfk = {
      ...localSound,
      id: 'local-private',
      roles: { ...localSound.roles, afk: false },
    };

    const options = buildTimeoutSoundboardOptions({
      localSounds: [localSound, localOnlyNonAfk],
      sharedSounds: [sharedSound],
      localPlayerId: 'player-1',
    });

    expect(options.some((option) => option.soundName === 'jesterBonk')).toBe(true);
    expect(options).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'custom:player-1:local-afk', label: 'Local buzzer' }),
      expect.objectContaining({ id: 'custom:player-2:shared-afk', label: 'Shared bell', ownerName: 'Morgana' }),
    ]));
    expect(options.some((option) => option.id === 'custom:player-1:local-private')).toBe(false);
    const localAfkOption = options.find((option) => option.id === 'custom:player-1:local-afk');
    expect(localAfkOption).toBeDefined();
    if (!localAfkOption) return;

    expect(getTimeoutSoundCommand(localAfkOption)).toEqual({
      customAudio: localSound,
    });
  });
});
