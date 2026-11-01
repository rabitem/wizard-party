import { describe, expect, it } from 'vitest';

import { isValidRoomCode, parseRoomCodeInput } from './room-code';

describe('parseRoomCodeInput', () => {
  it('lowercases plain codes and strips separators', () => {
    expect(parseRoomCodeInput('AB-C 123')).toBe('abc123');
  });

  it('extracts the code from invite links', () => {
    expect(parseRoomCodeInput('https://wizardparty.fun/join?room=xk7p2q')).toBe('xk7p2q');
    expect(parseRoomCodeInput('wizardparty.fun/?room=XK7P2Q&host=foo')).toBe('xk7p2q');
    expect(parseRoomCodeInput('https://wizardparty.fun/lobby/xk7p2q')).toBe('xk7p2q');
  });

  it('caps the code at the maximum length', () => {
    expect(parseRoomCodeInput('abcdefghijkl')).toBe('abcdefgh');
  });
});

describe('isValidRoomCode', () => {
  it('accepts codes within the allowed length', () => {
    expect(isValidRoomCode('abc')).toBe(false);
    expect(isValidRoomCode('abcd')).toBe(true);
    expect(isValidRoomCode('abcdefgh')).toBe(true);
  });
});
