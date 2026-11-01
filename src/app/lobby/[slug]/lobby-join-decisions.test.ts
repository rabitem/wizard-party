import { describe, expect, it } from 'vitest';

import {
  calcCanAutoRejoin,
  calcEffectiveIsJoining,
  calcIsAutoRejoining,
  getAutoRejoinEffectAction,
  shouldResetManualJoin,
} from './lobby-join-decisions';

describe('lobby rejoin decisions', () => {
  it('triggers auto-rejoin from state instead of timer-driven retries', () => {
    expect(getAutoRejoinEffectAction({
      canAutoRejoin: true,
      autoRejoinState: 'idle',
      error: null,
    })).toBe('join');

    expect(getAutoRejoinEffectAction({
      canAutoRejoin: true,
      autoRejoinState: 'triggered',
      error: 'Room expired',
    })).toBe('mark-failed');
  });

  it('never joins by itself on a visit that started with a connection (no rejoin after leaving)', () => {
    // Ready while the provider already reconnected: the auto-join is used up for this visit.
    expect(getAutoRejoinEffectAction({
      canAutoRejoin: false,
      isAlreadyConnecting: true,
      autoRejoinState: 'idle',
      error: null,
    })).toBe('skip');

    // Leaving drops the status back to idle; a skipped auto-join must not fire then.
    expect(getAutoRejoinEffectAction({
      canAutoRejoin: true,
      isAlreadyConnecting: false,
      autoRejoinState: 'skipped',
      error: null,
    })).toBeNull();
    expect(calcIsAutoRejoining({ canAutoRejoin: true, autoRejoinState: 'skipped', isConnected: false, error: null })).toBe(false);
  });

  it('resets manual join state only after success or error', () => {
    expect(shouldResetManualJoin({
      manualJoinTriggered: true,
      error: null,
      isConnected: true,
      isCorrectRoom: true,
    })).toBe(true);

    expect(shouldResetManualJoin({
      manualJoinTriggered: true,
      error: null,
      isConnected: false,
      isCorrectRoom: false,
    })).toBe(false);
  });

  it('rejoins from the saved name only without a connection of its own', () => {
    expect(calcCanAutoRejoin(true, 'idle', 'Merlin')).toBe(true);
    expect(calcCanAutoRejoin(true, 'reconnecting', 'Merlin')).toBe(false);
    expect(calcCanAutoRejoin(true, 'kicked', 'Merlin')).toBe(false);
    expect(calcCanAutoRejoin(true, 'idle', '')).toBe(false);
  });
});

describe('lobby joining screen (no name form flash for players who already have a name)', () => {
  it('counts an auto-join as underway before its effect has fired', () => {
    expect(calcIsAutoRejoining({ canAutoRejoin: true, autoRejoinState: 'idle', isConnected: false, error: null })).toBe(true);
    expect(calcIsAutoRejoining({ canAutoRejoin: false, autoRejoinState: 'idle', isConnected: false, error: null })).toBe(false);
  });

  it('treats a socket the home page already opened as a join awaiting its seat', () => {
    expect(calcIsAutoRejoining({ canAutoRejoin: false, autoRejoinState: 'idle', isConnected: true, error: null })).toBe(true);
  });

  it('keeps the auto-join underway after the socket opens, until it fails', () => {
    expect(calcIsAutoRejoining({ canAutoRejoin: false, autoRejoinState: 'triggered', isConnected: true, error: null })).toBe(true);
    expect(calcIsAutoRejoining({ canAutoRejoin: true, autoRejoinState: 'triggered', isConnected: false, error: 'Room expired' })).toBe(false);
    expect(calcIsAutoRejoining({ canAutoRejoin: true, autoRejoinState: 'failed', isConnected: false, error: null })).toBe(false);
  });

  it('shows the joining screen until the server has seated us', () => {
    expect(calcEffectiveIsJoining(false, true, false)).toBe(true);
    expect(calcEffectiveIsJoining(true, false, false)).toBe(true);
    expect(calcEffectiveIsJoining(false, true, true)).toBe(false);
    expect(calcEffectiveIsJoining(false, false, false)).toBe(false);
  });
});
