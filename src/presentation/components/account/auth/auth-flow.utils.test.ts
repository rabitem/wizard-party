import { describe, expect, it } from 'vitest';

import { cooldownSecondsLeft, isCompleteCode, maskEmail, parseSignInIdentifier, safeNext, sanitizeCode, usernameProblem } from './auth-flow.utils';

describe('parseSignInIdentifier', () => {
  it('should treat values with @ as email', () => {
    expect(parseSignInIdentifier('  ada@example.com ')).toEqual({ kind: 'email', email: 'ada@example.com' });
  });

  it('should treat values without @ as username', () => {
    expect(parseSignInIdentifier(' Merlin_42 ')).toEqual({ kind: 'username', username: 'Merlin_42' });
  });
});

describe('sanitizeCode', () => {
  it('should strip non-digits and cut to six digits', () => {
    expect(sanitizeCode('123 45-67')).toBe('123456');
  });

  it('should keep partial input', () => {
    expect(sanitizeCode('12a')).toBe('12');
  });
});

describe('isCompleteCode', () => {
  it('should accept exactly six digits', () => {
    expect(isCompleteCode('123456')).toBe(true);
    expect(isCompleteCode('12345')).toBe(false);
    expect(isCompleteCode('12345a')).toBe(false);
  });
});

describe('cooldownSecondsLeft', () => {
  it('should be zero when nothing was sent', () => {
    expect(cooldownSecondsLeft(null, 1000)).toBe(0);
  });

  it('should round remaining time up to whole seconds', () => {
    expect(cooldownSecondsLeft(0, 59_100, 60)).toBe(1);
    expect(cooldownSecondsLeft(0, 0, 60)).toBe(60);
  });

  it('should be zero once the cooldown passed', () => {
    expect(cooldownSecondsLeft(0, 60_000, 60)).toBe(0);
    expect(cooldownSecondsLeft(0, 90_000, 60)).toBe(0);
  });
});

describe('usernameProblem', () => {
  it('should return null for a valid username', () => {
    expect(usernameProblem('Merlin.the_Wise')).toBeNull();
  });

  it('should explain invalid usernames', () => {
    expect(usernameProblem('ab')).toMatch(/characters/);
    expect(usernameProblem('bad name')).toMatch(/letters/);
    expect(usernameProblem('admin')).toMatch(/reserved/);
  });
});

describe('maskEmail', () => {
  it('should hide most of the local part', () => {
    expect(maskEmail('ada.lovelace@example.com')).toBe('ad******@example.com');
    expect(maskEmail('al@example.com')).toBe('a*@example.com');
    expect(maskEmail('a@example.com')).toBe('a*@example.com');
  });

  it('should return non-emails unchanged', () => {
    expect(maskEmail('merlin')).toBe('merlin');
  });
});

describe('safeNext', () => {
  it('should allow same-site paths', () => {
    expect(safeNext('/account')).toBe('/account');
  });

  it('should reject external or missing targets', () => {
    expect(safeNext('//evil.com')).toBe('/');
    expect(safeNext('/\\evil.com')).toBe('/');
    expect(safeNext('https://evil.com')).toBe('/');
    expect(safeNext(null)).toBe('/');
  });
});
