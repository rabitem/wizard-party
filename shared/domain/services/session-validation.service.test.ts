import { describe, expect, it } from 'vitest';

import { SessionValidationService } from './session-validation.service';

describe('SessionValidationService.validatePersistentId', () => {
  // The browser keeps its id in localStorage for good, so neither its age nor the clock it was
  // made on may lock a returning player out (regression: ids older than a year were refused).
  it.each([
    ['first made years ago', 'player-1500000000000-abc1234'],
    ['made on a clock running far ahead', 'player-9999999999999-k3x9q2a'],
    ['made moments ago', 'player-1800000000000-0000000'],
  ])('accepts a browser id %s', (_label, persistentId) => {
    expect(SessionValidationService.validatePersistentId(persistentId)).toEqual({ isValid: true });
  });

  it.each([
    ['an empty id', ''],
    ['a name', 'alice'],
    ['upper-case letters', 'player-1500000000000-ABC1234'],
    ['a short random part', 'player-1500000000000-abc123'],
    ['no timestamp', 'player--abc1234'],
    ['an opaque seat id', 'seat-3f2a9c1e7b4d4e0f'],
  ])('refuses %s', (_label, persistentId) => {
    expect(SessionValidationService.validatePersistentId(persistentId).isValid).toBe(false);
  });
});
