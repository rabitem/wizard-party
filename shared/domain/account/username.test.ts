import { describe, expect, it } from 'vitest';

import { USERNAME_RULES, canChangeUsername, deriveUsername, nextUsernameChangeAt, validateUsername, withUsernameSuffix } from './username';

const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

describe('deriveUsername', () => {
  it('should turn a provider name into a valid username', () => {
    expect(deriveUsername('Merlin')).toBe('Merlin');
    expect(deriveUsername('  Hui   Si ')).toBe('Hui_Si');
    expect(deriveUsername('José García')).toBe('Jose_Garcia');
    expect(deriveUsername("D'Artagnan 3rd!")).toBe('DArtagnan_3rd');
    expect(deriveUsername('..dot..name..')).toBe('dot.name');
  });

  it('should leave room for a unique suffix', () => {
    const derived = deriveUsername('Merlin Ambrosius the Wise');
    expect(derived).toBe('Merlin_Ambrosius');
    expect(derived?.length).toBe(USERNAME_RULES.MAX_LENGTH - USERNAME_RULES.SUFFIX_DIGITS);
  });

  it('should give up on names with nothing usable, too short or reserved', () => {
    expect(deriveUsername('李小龍')).toBeNull();
    expect(deriveUsername('Al')).toBeNull();
    expect(deriveUsername('Admin')).toBeNull();
    expect(deriveUsername(null)).toBeNull();
  });
});

describe('withUsernameSuffix', () => {
  it('should append four digits and stay valid', () => {
    expect(withUsernameSuffix('Merlin', () => 0.0042)).toBe('Merlin0042');
    const long = withUsernameSuffix('Merlin_Ambrosius', () => 0.9999);
    expect(long).toBe('Merlin_Ambrosius9999');
    expect(validateUsername(long)).toBeNull();
  });
});

describe('rename cooldown', () => {
  it('should allow the first rename right away', () => {
    expect(nextUsernameChangeAt(null)).toBeNull();
    expect(canChangeUsername(null, NOW)).toBe(true);
  });

  it('should allow the next rename 30 days after the last one', () => {
    const changedAt = NOW - 10 * DAY;
    expect(nextUsernameChangeAt(changedAt)).toBe(changedAt + 30 * DAY);
    expect(canChangeUsername(changedAt, NOW)).toBe(false);
    expect(canChangeUsername(changedAt, changedAt + 30 * DAY)).toBe(true);
  });
});
