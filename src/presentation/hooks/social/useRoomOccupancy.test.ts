import { describe, expect, it } from 'vitest';

import { parseRoomOccupancy } from './useRoomOccupancy';

describe('parseRoomOccupancy', () => {
  it('should read the seat count of a lobby', () => {
    expect(parseRoomOccupancy({ roomId: 'abc', playerCount: 3, maxPlayers: 6, phase: 'LOBBY' })).toEqual({ playerCount: 3, maxPlayers: 6, inGame: false });
  });

  it('should mark a room with a running game', () => {
    expect(parseRoomOccupancy({ playerCount: 4, maxPlayers: 4, phase: 'BIDDING' })?.inGame).toBe(true);
  });

  it('should reject answers without usable counts', () => {
    expect(parseRoomOccupancy(null)).toBeNull();
    expect(parseRoomOccupancy('nope')).toBeNull();
    expect(parseRoomOccupancy({ playerCount: '3', maxPlayers: 6 })).toBeNull();
    expect(parseRoomOccupancy({ playerCount: 3, maxPlayers: 0 })).toBeNull();
  });
});
