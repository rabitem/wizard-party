import { describe, expect, it } from 'vitest';

import { tournamentTicketStorageKey } from '@shared/tournament/tournament-wire';

import { clearMatchTicket, parseStoredMatchTicket, saveMatchTicket } from './match-ticket-storage';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

const ROOM = 't-abcdefghjkmnpq';
const TICKET = { ticket: 'v1.payload.sig', tournamentId: 'tour12345678', expiresAt: 2_000 };

describe('match ticket storage', () => {
  describe('saveMatchTicket', () => {
    it('should store the ticket as JSON under the shared storage key', () => {
      const storage = memoryStorage();
      expect(saveMatchTicket(ROOM, TICKET, storage)).toBe(true);
      expect(JSON.parse(storage.values.get(tournamentTicketStorageKey(ROOM))!)).toEqual(TICKET);
    });

    it('should report failure when storage is unavailable or throws', () => {
      expect(saveMatchTicket(ROOM, TICKET, null)).toBe(false);
      const full = { ...memoryStorage(), setItem: () => { throw new Error('quota'); } };
      expect(saveMatchTicket(ROOM, TICKET, full)).toBe(false);
    });
  });

  describe('parseStoredMatchTicket', () => {
    it('should reject entries with missing or mistyped fields', () => {
      expect(parseStoredMatchTicket(null)).toBeNull();
      expect(parseStoredMatchTicket(JSON.stringify({ ...TICKET, ticket: '' }))).toBeNull();
      expect(parseStoredMatchTicket(JSON.stringify({ ...TICKET, tournamentId: 4 }))).toBeNull();
      expect(parseStoredMatchTicket(JSON.stringify({ ...TICKET, expiresAt: 'soon' }))).toBeNull();
      expect(parseStoredMatchTicket('null')).toBeNull();
    });
  });

  it('should clear a stored ticket', () => {
    const storage = memoryStorage();
    saveMatchTicket(ROOM, TICKET, storage);
    clearMatchTicket(ROOM, storage);
    expect(storage.values.size).toBe(0);
  });
});
