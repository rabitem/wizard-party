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

describe('SessionValidationService.isSessionToken', () => {
  // Server-issued tokens are base64url of at least 32 random bytes: 43 characters or more.
  const token = (length: number, char = 'a') => char.repeat(length);

  it.each([
    ['32 random bytes', token(43)],
    ['the longest accepted token', token(128)],
    ['the whole base64url alphabet', 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'],
  ])('accepts %s', (_label, value) => {
    expect(SessionValidationService.isSessionToken(value)).toBe(true);
  });

  it.each([
    ['fewer than 32 bytes', token(42)],
    ['an oversized value', token(129)],
    ['standard base64 padding', `${token(42)}=`],
    ['a "+" from standard base64', `${token(42)}+`],
    ['a persistent id', 'player-1500000000000-abc1234'],
    ['a number', 1234567890],
    ['nothing', undefined],
  ])('refuses %s', (_label, value) => {
    expect(SessionValidationService.isSessionToken(value)).toBe(false);
  });
});

describe('SessionValidationService.secretsMatch', () => {
  const secret = 'Zm9vYmFyYmF6cXV4cXV1eGNvcmdlZ3JhdWx0Z2FycGx5';

  it('opens a seat only with the identical token', () => {
    expect(SessionValidationService.secretsMatch(secret, secret.slice())).toBe(true);
  });

  it.each([
    ['the last character differs', `${secret.slice(0, -1)}z`],
    ['the first character differs', `X${secret.slice(1)}`],
    ['it differs only in case', secret.toLowerCase()],
    ['it is a prefix of the token', secret.slice(0, -1)],
    ['it extends the token', `${secret}a`],
    ['it is empty', ''],
  ])('refuses a presented token when %s', (_label, presented) => {
    expect(SessionValidationService.secretsMatch(secret, presented)).toBe(false);
  });
});
