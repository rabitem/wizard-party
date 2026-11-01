import { describe, expect, it } from 'vitest';

import { Game, GamePhase, Player, getTrickPresentationMs } from '../../shared/domain';
import { TOURNAMENT_TIMING } from '../../shared/domain/tournament';
import { bindSeat, lockMatchRecord, type TournamentMatchRecord } from './match-record';
import { TOURNAMENT_ROOM_TIMING } from './match-room.constants';
import { matchDeadlines, nextMatchDeadline, reconcileMatchRecord } from './match-schedule';
import { TEST_NOW, TEST_ROOM, THREE_MEMBERS, ticketClaims } from './tournament-test-support';

function seatedTable(): { game: Game; record: TournamentMatchRecord } {
  const game = new Game(TEST_ROOM, 'p-a');
  let record = lockMatchRecord(ticketClaims('user-a'), TEST_NOW);
  for (const member of THREE_MEMBERS) {
    const playerId = `p-${member.uid.slice(-1)}`;
    game.addPlayer(new Player(playerId, member.name));
    record = bindSeat(record, member.uid, playerId, TEST_NOW);
  }
  return { game, record };
}

describe('match schedule', () => {
  describe('reconcileMatchRecord', () => {
    it('should start the countdown once every member is seated and keep its time', () => {
      const { game, record } = seatedTable();

      const counting = reconcileMatchRecord(record, game, TEST_NOW + 1_000);
      const later = reconcileMatchRecord(counting, game, TEST_NOW + 4_000);

      expect(counting.autoStartAt).toBe(TEST_NOW + 1_000 + TOURNAMENT_TIMING.AUTO_START_COUNTDOWN_MS);
      expect(later).toBe(counting);
    });

    it('should mark a seat a bot took over after the start, and keep the mark', () => {
      const { game, record } = seatedTable();
      const started = { ...record, startedAt: TEST_NOW };
      game.phase = GamePhase.PLAYING;
      game.getPlayer('p-c')!.isBot = true;

      const marked = reconcileMatchRecord(started, game, TEST_NOW);
      game.getPlayer('p-c')!.isBot = false;
      const after = reconcileMatchRecord(marked, game, TEST_NOW);

      expect(after.seats.find((seat) => seat.uid === 'user-c')?.botTakeover).toBe(true);
      expect(after.seats.filter((seat) => seat.botTakeover)).toHaveLength(1);
    });
  });

  describe('matchDeadlines', () => {
    it('should advance a finished round sooner when the host is not at the table', () => {
      const { game, record } = seatedTable();
      game.phase = GamePhase.ROUND_END;
      const ended = { ...record, startedAt: TEST_NOW, roundEnd: { round: 1, since: TEST_NOW } };

      expect(matchDeadlines(ended, game).roundAdvance).toBe(TEST_NOW + TOURNAMENT_ROOM_TIMING.ROUND_END_AUTO_ADVANCE_MS);
      game.getPlayer('p-a')!.isBot = true;
      // Counted from when the tables have collected the round's last trick.
      expect(nextMatchDeadline(matchDeadlines(ended, game))).toBe(
        TEST_NOW + getTrickPresentationMs(game.players.length) + TOURNAMENT_ROOM_TIMING.HOSTLESS_ROUND_END_ADVANCE_MS
      );
    });
  });
});
