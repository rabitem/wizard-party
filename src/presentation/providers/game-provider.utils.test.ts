import { describe, expect, it } from 'vitest';

import { getRouteRoomId } from './game-provider.utils';

describe('getRouteRoomId', () => {
  it('takes the room from the game routes, so a refresh rejoins the room on screen', () => {
    expect(getRouteRoomId('/game/ydu3kh')).toBe('ydu3kh');
    expect(getRouteRoomId('/lobby/g2d4j2')).toBe('g2d4j2');
    expect(getRouteRoomId('/results/ydu3kh')).toBe('ydu3kh');
  });

  it('decodes an encoded room code', () => {
    expect(getRouteRoomId('/lobby/my%20room')).toBe('my room');
  });

  it('is null outside the game routes', () => {
    expect(getRouteRoomId('/')).toBeNull();
    expect(getRouteRoomId('/lobby/')).toBeNull();
    expect(getRouteRoomId('/account')).toBeNull();
  });
});
