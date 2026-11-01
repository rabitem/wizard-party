import { describe, expect, it } from 'vitest';
import { CONSTANTS } from './constants';

describe('CONSTANTS.STORAGE_KEYS', () => {
  // Players' browsers already hold data under these keys: renaming one silently drops their
  // session, seat tokens, stats or settings. Add new keys freely; never change these.
  it('should keep the storage keys players already have saved data under', () => {
    expect(CONSTANTS.STORAGE_KEYS).toMatchObject({
      SESSION: 'wizard-party-session',
      USERNAME: 'wizard-party-username',
      SETTINGS: 'wizard-party-settings',
      SANDBOX_SETTINGS: 'wizard-party-sandbox-settings',
      PLAYER_ID: 'wizard-party-player-id',
      SEAT_SESSIONS: 'wizard-party-seat-sessions',
      PLAYER_STATS: 'wizard-party-player-stats',
      RECENT_ROOMS: 'wizard-party-recent-rooms',
      TUTORIAL_SEEN: 'wizard-party-tutorial-seen',
    });
  });
});
