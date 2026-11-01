import { describe, expect, it } from 'vitest';

import { TOURNAMENT_TIMING } from '../../shared/domain/tournament';
import {
  bindSeat,
  isPastDeadline,
  lockMatchRecord,
  matchDeadline,
  noShowDeadline,
  parseMatchRecord,
  seatOfPlayer,
  seatOfUser,
  updateSeat,
} from './match-record';
import { TEST_NOW, ticketClaims } from './tournament-test-support';

describe('match record', () => {
  describe('lockMatchRecord', () => {
    it('locks the room to the ticket match with one unbound seat per roster member in deal order', () => {
      const record = lockMatchRecord(ticketClaims('user-a', { bots: 1 }), TEST_NOW);

      expect(record.mid).toBe(ticketClaims('user-a').mid);
      expect(record.seats.map((seat) => [seat.seat, seat.name, seat.playerId])).toEqual([
        [0, 'Morgana', null],
        [1, 'Merlin', null],
        [2, 'Nimue', null],
      ]);
      expect(record.firstJoinAt).toBeNull();
      expect(noShowDeadline(record)).toBeNull();
    });
  });

  describe('bindSeat', () => {
    it('should bind a member to a player and start the no-show clock only once', () => {
      const locked = lockMatchRecord(ticketClaims('user-a'), TEST_NOW);
      const first = bindSeat(locked, 'user-a', 'player-1', TEST_NOW + 1_000);
      const second = bindSeat(first, 'user-b', 'player-2', TEST_NOW + 5_000);

      expect(seatOfUser(second, 'user-a')?.playerId).toBe('player-1');
      expect(seatOfPlayer(second, 'player-2')?.uid).toBe('user-b');
      expect(second.firstJoinAt).toBe(TEST_NOW + 1_000);
      expect(noShowDeadline(second)).toBe(TEST_NOW + 1_000 + TOURNAMENT_TIMING.NO_SHOW_GRACE_MS);
      expect(noShowDeadline({ ...second, startedAt: TEST_NOW + 9_000 })).toBeNull();
    });

    it('should return the same record when nothing changes', () => {
      const bound = bindSeat(lockMatchRecord(ticketClaims('user-a'), TEST_NOW), 'user-a', 'player-1', TEST_NOW);

      expect(updateSeat(bound, 'user-a', { playerId: 'player-1' })).toBe(bound);
      expect(updateSeat(bound, 'nobody', { noShow: true })).toBe(bound);
    });
  });

  describe('parseMatchRecord', () => {
    it('should restore a persisted record', () => {
      const record = bindSeat(lockMatchRecord(ticketClaims('user-a', { bots: 1 }), TEST_NOW), 'user-c', 'player-3', TEST_NOW);

      expect(parseMatchRecord(structuredClone(record))).toEqual(record);
    });

    it('should drop unreadable or inconsistent records', () => {
      const record = lockMatchRecord(ticketClaims('user-a'), TEST_NOW);

      expect(parseMatchRecord(undefined)).toBeNull();
      expect(parseMatchRecord({ ...record, v: 99 })).toBeNull();
      expect(parseMatchRecord({ ...record, room: 't-aaaaaaaaaaaaaa' })).toBeNull();
      expect(parseMatchRecord({ ...record, seats: record.seats.slice(1) })).toBeNull();
      expect(parseMatchRecord({ ...record, seats: record.seats.map((seat) => ({ ...seat, uid: `${seat.uid}x` })) })).toBeNull();
      expect(parseMatchRecord({ ...record, startedAt: 'soon' })).toBeNull();
      expect(parseMatchRecord({ ...record, expiredAt: 'later' })).toBeNull();
    });

    it('should restore records stored before the server outcome and expiry were kept', () => {
      const { reportOutcome: _outcome, expiredAt: _expired, ...older } = lockMatchRecord(ticketClaims('user-a'), TEST_NOW);

      expect(parseMatchRecord(structuredClone(older))).toMatchObject({ reportOutcome: null, expiredAt: null });
      expect(parseMatchRecord({ ...older, reportOutcome: 'superseded' })?.reportOutcome).toBe('superseded');
      expect(parseMatchRecord({ ...older, reportOutcome: 'rejected' })?.reportOutcome).toBe('rejected');
      expect(parseMatchRecord({ ...older, reportOutcome: 'nonsense' })?.reportOutcome).toBeNull();
    });
  });

  describe('match deadline', () => {
    it('should come from the ticket, and be absent for tickets issued before it was sent', () => {
      const deadlineAt = TEST_NOW + 60_000;
      const record = lockMatchRecord(ticketClaims('user-a', { deadlineAt }), TEST_NOW);

      expect(matchDeadline(record)).toBe(deadlineAt);
      expect(isPastDeadline(record, deadlineAt - 1)).toBe(false);
      expect(isPastDeadline(record, deadlineAt)).toBe(true);
      expect(parseMatchRecord(structuredClone(record))?.match.deadlineAt).toBe(deadlineAt);

      const older = lockMatchRecord(ticketClaims('user-a'), TEST_NOW);
      expect(matchDeadline(older)).toBeNull();
      expect(isPastDeadline(older, Number.MAX_SAFE_INTEGER)).toBe(false);
    });

    it('should stop the no-show clock of an expired table', () => {
      const bound = bindSeat(lockMatchRecord(ticketClaims('user-a'), TEST_NOW), 'user-a', 'player-1', TEST_NOW);

      expect(noShowDeadline({ ...bound, expiredAt: TEST_NOW + 1 })).toBeNull();
    });
  });
});
