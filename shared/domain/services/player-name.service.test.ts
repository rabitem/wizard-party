import { describe, expect, it } from 'vitest';

import { PlayerNameService } from './player-name.service';

describe('PlayerNameService.validate', () => {
  it.each([
    ['a plain name', 'Merlin', 'Merlin'],
    ['two characters', 'Al', 'Al'],
    ['twenty characters', 'A'.repeat(20), 'A'.repeat(20)],
    ['umlauts and other letters', 'Jürgen Ølsen', 'Jürgen Ølsen'],
    ['digits, hyphens and underscores', 'wiz_ard-42', 'wiz_ard-42'],
    ['surrounding spaces, which are trimmed', '  Morgana  ', 'Morgana'],
  ])('accepts %s', (_label, name, sanitizedName) => {
    expect(PlayerNameService.validate(name)).toEqual({ isValid: true, sanitizedName });
  });

  it.each([
    ['an empty name', '', 'Name cannot be empty'],
    ['only spaces', '   ', 'Name cannot be empty'],
    ['one character', ' A ', 'Name must be at least 2 characters'],
    ['21 characters', 'A'.repeat(21), 'Name must be at most 20 characters'],
    ['markup', '<b>Merlin</b>', 'Name can only contain letters, numbers, spaces, hyphens, and underscores'],
    ['an emoji', 'Merlin 🧙', 'Name can only contain letters, numbers, spaces, hyphens, and underscores'],
    ['consecutive spaces', 'Merlin  Grey', 'Name cannot contain consecutive spaces'],
  ])('refuses %s', (_label, name, error) => {
    expect(PlayerNameService.validate(name)).toEqual({ isValid: false, error });
  });
});

describe('PlayerNameService.isUniqueInGame', () => {
  const players = [
    { id: 'p1', name: 'Merlin' },
    { id: 'p2', name: 'Morgana' },
  ];

  it('treats names that differ only in case or surrounding spaces as taken', () => {
    expect(PlayerNameService.isUniqueInGame('  merlin ', players)).toBe(false);
    expect(PlayerNameService.isUniqueInGame('MORGANA', players)).toBe(false);
    expect(PlayerNameService.isUniqueInGame('Merlina', players)).toBe(true);
  });

  it('lets a returning player keep their own name', () => {
    expect(PlayerNameService.isUniqueInGame('Merlin', players, 'p1')).toBe(true);
    expect(PlayerNameService.isUniqueInGame('Merlin', players, 'p2')).toBe(false);
  });
});
