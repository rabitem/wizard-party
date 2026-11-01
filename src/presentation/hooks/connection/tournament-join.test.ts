import { describe, expect, it } from 'vitest';

import { TOURNAMENT_GAME_ERROR_CODES } from '@shared/domain';
import { matchIdFor, matchRoomCode } from '@shared/domain/tournament';
import { tournamentTicketStorageKey } from '@shared/tournament';

import { isTournamentJoinRejectionCode, prepareTournamentJoin, toTournamentJoinRejection } from './tournament-join';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

const TID = 'abcdefghjk23';
const MID = matchIdFor(TID, 2, 1);
const ROOM = matchRoomCode(MID);
const KEY = tournamentTicketStorageKey(ROOM);

function store(storage: ReturnType<typeof memoryStorage>, expiresAt: number, ticket = 'v1.payload.sig') {
  storage.setItem(KEY, JSON.stringify({ ticket, tournamentId: TID, expiresAt }));
}

describe('tournament join', () => {
  describe('prepareTournamentJoin', () => {
    it('should send nothing for rooms without a ticket', () => {
      expect(prepareTournamentJoin('ABCD', memoryStorage())).toEqual({ fields: {}, tournamentId: null });
      expect(prepareTournamentJoin(ROOM, null)).toEqual({ fields: {}, tournamentId: null });
    });

    it('should keep sending an expired ticket: it still takes back a seat its holder already has', () => {
      const storage = memoryStorage();
      store(storage, 1);
      expect(prepareTournamentJoin(ROOM, storage)).toEqual({ fields: { tournamentTicket: 'v1.payload.sig' }, tournamentId: TID });
      expect(storage.values.has(KEY)).toBe(true);
    });

    it('should drop unreadable entries and survive throwing storage', () => {
      const storage = memoryStorage();
      storage.setItem(KEY, '{broken');
      expect(prepareTournamentJoin(ROOM, storage)).toEqual({ fields: {}, tournamentId: null });
      expect(storage.values.has(KEY)).toBe(false);
      const throwing = { ...memoryStorage(), getItem: () => { throw new Error('denied'); } };
      expect(prepareTournamentJoin(ROOM, throwing)).toEqual({ fields: {}, tournamentId: null });
    });
  });

  describe('toTournamentJoinRejection', () => {
    it('should recognize only the join refusals of match rooms', () => {
      expect(isTournamentJoinRejectionCode(TOURNAMENT_GAME_ERROR_CODES.TICKET_REQUIRED)).toBe(true);
      expect(isTournamentJoinRejectionCode(TOURNAMENT_GAME_ERROR_CODES.TICKET_INVALID)).toBe(true);
      expect(isTournamentJoinRejectionCode(TOURNAMENT_GAME_ERROR_CODES.NO_SHOW)).toBe(true);
      expect(isTournamentJoinRejectionCode(TOURNAMENT_GAME_ERROR_CODES.UNAVAILABLE)).toBe(true);
      // A locked command is a transient error toast, not a refused seat.
      expect(isTournamentJoinRejectionCode(TOURNAMENT_GAME_ERROR_CODES.MATCH_LOCKED)).toBe(false);
      expect(isTournamentJoinRejectionCode(undefined)).toBe(false);
    });

    it('should drop a refused ticket and keep the tournament link', () => {
      const storage = memoryStorage();
      store(storage, 5_000);
      const rejection = toTournamentJoinRejection(TOURNAMENT_GAME_ERROR_CODES.TICKET_INVALID, 'nope', ROOM, TID, storage);
      expect(rejection).toEqual({ code: TOURNAMENT_GAME_ERROR_CODES.TICKET_INVALID, message: 'nope', roomId: ROOM, tournamentId: TID });
      expect(storage.values.has(KEY)).toBe(false);
    });

    it('should drop the ticket of a no-show for good', () => {
      const storage = memoryStorage();
      store(storage, 5_000);
      toTournamentJoinRejection(TOURNAMENT_GAME_ERROR_CODES.NO_SHOW, 'gone', ROOM, TID, storage);
      expect(storage.values.has(KEY)).toBe(false);
    });

    it('should keep the stored ticket when tournaments are only unavailable', () => {
      const storage = memoryStorage();
      store(storage, 5_000);
      toTournamentJoinRejection(TOURNAMENT_GAME_ERROR_CODES.UNAVAILABLE, 'later', ROOM, TID, storage);
      expect(storage.values.has(KEY)).toBe(true);
    });
  });
});
