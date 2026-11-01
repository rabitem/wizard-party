import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_RULESET_CONFIG } from '@shared/domain';

import {
  PENDING_ROOM_STORAGE_KEY,
  getPendingRoomSetupForRoom,
  parsePendingRoomSetup,
  savePendingRoomSetup,
  serializePendingRoomSetup,
} from './pending-room';

describe('pending room setup settings', () => {
  it('round-trips creator settings so lobby fallback joins can create the configured room', () => {
    const serialized = serializePendingRoomSetup({
      roomId: 'arcane7',
      host: ' http://127.0.0.1:1999/ ',
      isCreator: true,
      settings: {
        name: '  Arcane Den  ',
        isPublic: false,
        maxPlayers: 4,
        rulesetConfig: {
          ...DEFAULT_RULESET_CONFIG,
          bidding: {
            ...DEFAULT_RULESET_CONFIG.bidding,
            hiddenBids: true,
          },
        },
      },
    });

    const setup = parsePendingRoomSetup(serialized);

    expect(setup).toMatchObject({
      roomId: 'arcane7',
      host: '127.0.0.1:1999',
      isCreator: true,
      settings: {
        name: 'Arcane Den',
        isPublic: false,
        maxPlayers: 4,
      },
    });
    expect(setup?.settings?.rulesetConfig?.bidding.hiddenBids).toBe(true);
  });

  describe('in session storage', () => {
    let store: Map<string, string>;

    beforeEach(() => {
      store = new Map();
      vi.stubGlobal('window', {
        sessionStorage: {
          getItem: (key: string) => store.get(key) ?? null,
          setItem: (key: string, value: string) => store.set(key, value),
          removeItem: (key: string) => store.delete(key),
        },
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('only returns pending setup for the matching lobby room', () => {
      savePendingRoomSetup({
        roomId: 'arcane7',
        host: 'localhost:1999',
        isCreator: true,
        settings: {
          name: 'Arcane Den',
          isPublic: false,
          maxPlayers: 4,
        },
      });

      expect(store.has(PENDING_ROOM_STORAGE_KEY)).toBe(true);
      expect(getPendingRoomSetupForRoom('other-room')).toBeNull();
      expect(getPendingRoomSetupForRoom('arcane7')?.settings?.maxPlayers).toBe(4);
    });
  });
});
