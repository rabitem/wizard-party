import { describe, expect, it } from 'vitest';

import { DEFAULT_RULESET_CONFIG } from '@shared/domain';
import { buildCreateRoomSettings } from './create-room-settings';

describe('buildCreateRoomSettings', () => {
  it('includes selected ruleset and falls back to room code for blank room names', () => {
    const rulesetConfig = {
      ...DEFAULT_RULESET_CONFIG,
      bidding: {
        ...DEFAULT_RULESET_CONFIG.bidding,
        hiddenBids: true,
      },
      scoring: {
        ...DEFAULT_RULESET_CONFIG.scoring,
        baseBidPoints: 35,
      },
    };

    const settings = buildCreateRoomSettings({
      roomId: 'arcane7',
      roomName: '   ',
      isPublic: false,
      maxPlayers: 4,
      rulesetConfig,
    });

    expect(settings).toEqual({
      name: 'arcane7',
      isPublic: false,
      maxPlayers: 4,
      rulesetConfig,
    });
  });

  it('normalizes impossible room setup values before sending them to the server', () => {
    const settings = buildCreateRoomSettings({
      roomId: 'arcane7',
      roomName: '  The Arcane Den  ',
      isPublic: 'yes' as never,
      maxPlayers: 99,
      rulesetConfig: {
        ...DEFAULT_RULESET_CONFIG,
        structure: {
          ...DEFAULT_RULESET_CONFIG.structure,
          customRoundCount: 200,
        },
      },
    });

    expect(settings.name).toBe('The Arcane Den');
    expect(settings.isPublic).toBe(true);
    expect(settings.maxPlayers).toBe(6);
    expect(settings.rulesetConfig?.structure.customRoundCount).toBeNull();
  });
});
