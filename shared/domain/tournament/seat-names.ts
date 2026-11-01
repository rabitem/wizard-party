import { PlayerNameService } from '../services/player-name.service';
import type { TournamentPlayerRef } from './tournament.types';

const FALLBACK_NAME = 'Mage';
const DISALLOWED = /[^\p{L}\p{N}\s\-_]/gu;

/** Reduces a name to what the game accepts (letters, digits, spaces, - and _; 2–20 chars). */
export function toSeatName(value: string): string | null {
  const cleaned = value
    .replace(/\./g, '_')
    .replace(DISALLOWED, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, PlayerNameService.MAX_LENGTH)
    .trim();
  const result = PlayerNameService.validate(cleaned);
  return result.isValid && result.sanitizedName ? result.sanitizedName : null;
}

function withSuffix(base: string, suffix: number): string {
  const tail = ` ${suffix}`;
  return `${base.slice(0, PlayerNameService.MAX_LENGTH - tail.length).trim()}${tail}`;
}

/**
 * The names players sit under at a match table, unique within the table (case-insensitive) and
 * valid for the game: the account name as the player spells it (the snapshot taken at
 * registration), else the lowercase username, else a numbered fallback. Computed by the
 * server and carried in the signed ticket, so the worker never trusts a client supplied name.
 */
export function assignSeatNames(players: readonly TournamentPlayerRef[]): Map<string, string> {
  const names = new Map<string, string>();
  const taken = new Set<string>();
  const claim = (userId: string, name: string) => {
    names.set(userId, name);
    taken.add(PlayerNameService.normalize(name));
  };
  const isFree = (name: string | null): name is string => name !== null && !taken.has(PlayerNameService.normalize(name));

  for (const player of players) {
    const display = toSeatName(player.displayName);
    const handle = player.username ? toSeatName(player.username) : null;
    if (isFree(display)) {
      claim(player.userId, display);
      continue;
    }
    if (isFree(handle)) {
      claim(player.userId, handle);
      continue;
    }
    const base = display ?? handle ?? FALLBACK_NAME;
    if (isFree(base)) {
      claim(player.userId, base);
      continue;
    }
    let suffix = 2;
    while (!isFree(withSuffix(base, suffix))) suffix += 1;
    claim(player.userId, withSuffix(base, suffix));
  }
  return names;
}
