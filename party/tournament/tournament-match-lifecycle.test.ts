import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ClientCommandType, DEFAULT_RULESET_CONFIG, GamePhase, TOURNAMENT_GAME_ERROR_CODES } from '../../shared/domain';
import { createUseCaseRegistry } from '../../shared/application';
import { TOURNAMENT_TIMING } from '../../shared/domain/tournament';
import { parseMatchProgressReport, parseMatchResultReport } from '../../shared/tournament';
import {
  DISCONNECT_SETTLE_MS,
  matchRoom,
  matchStateOf,
  playToEnd,
  restartMatchRoom,
  seat,
  step,
} from '../test-support/match-driver';
import { refusalCodesOf } from '../test-support/table-driver';
import { parseMatchRecord } from './match-record';
import { TOURNAMENT_MATCH_STORAGE_KEY, TOURNAMENT_ROOM_TIMING } from './match-room.constants';
import { TEST_NOW, settle, ticketClaims } from './tournament-test-support';

const { NO_SHOW, MATCH_LOCKED } = TOURNAMENT_GAME_ERROR_CODES;

const TWO_ROUND_RULESET = {
  ...DEFAULT_RULESET_CONFIG,
  structure: { ...DEFAULT_RULESET_CONFIG.structure, customRoundCount: 2 },
};

async function fullTable(options: { bots?: number; rulesetConfig?: typeof TWO_ROUND_RULESET; deadlineAt?: number } = {}) {
  const room = await matchRoom();
  const merlin = await seat(room, 'aaaaaaa', ticketClaims('user-a', options));
  const morgana = await seat(room, 'bbbbbbb', ticketClaims('user-b', options));
  const nimue = await seat(room, 'ccccccc', ticketClaims('user-c', options));
  return { ...room, merlin, morgana, nimue };
}

describe('tournament match room: lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(TEST_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('auto start', () => {
    it('should wait for the roster with the no-show deadline armed from the first join', async () => {
      const room = await matchRoom();
      const merlin = await seat(room, 'aaaaaaa', ticketClaims('user-a'));

      expect(room.h.tournamentAlarm.at).toBe(TEST_NOW + TOURNAMENT_TIMING.NO_SHOW_GRACE_MS);
      expect(matchStateOf(merlin)?.noShowDeadlineAt).toBe(TEST_NOW + TOURNAMENT_TIMING.NO_SHOW_GRACE_MS);
    });

    it('should count down once the whole roster is seated and start in deal order', async () => {
      const t = await fullTable({ bots: 1 });

      expect(t.h.tournamentAlarm.at).toBe(TEST_NOW + TOURNAMENT_TIMING.AUTO_START_COUNTDOWN_MS);
      expect(matchStateOf(t.nimue)?.autoStartAt).toBe(TEST_NOW + TOURNAMENT_TIMING.AUTO_START_COUNTDOWN_MS);

      await t.h.fireAlarm('tournament');

      expect(t.h.game.phase).not.toBe(GamePhase.LOBBY);
      // Roster seats 0..2 (Morgana, Merlin, Nimue), then the descriptor's bot.
      expect(t.h.game.players.map((player) => [player.name, player.isBot])).toEqual([
        ['Morgana', false],
        ['Merlin', false],
        ['Nimue', false],
        [expect.any(String), true],
      ]);
      expect(matchStateOf(t.nimue)?.autoStartAt).toBeNull();
    });

    it('should retry a start that failed after a pause, reusing the bots it already seated', async () => {
      const useCases = createUseCaseRegistry();
      const room = await matchRoom({ useCases });
      await seat(room, 'aaaaaaa', ticketClaims('user-a', { bots: 1 }));
      vi.spyOn(useCases.startGame, 'execute').mockImplementationOnce(() => {
        throw new Error('storage hiccup');
      });

      await room.h.fireAlarm('tournament');

      expect(room.h.game.phase).toBe(GamePhase.LOBBY);
      expect(room.h.tournamentAlarm.at).toBe(Date.now() + TOURNAMENT_ROOM_TIMING.FAILED_ALARM_RETRY_MS);

      await room.h.fireAlarm('tournament');

      expect(room.h.game.phase).not.toBe(GamePhase.LOBBY);
      expect(room.h.game.players).toHaveLength(4);
    });

    it('should cancel the countdown when a member drops out of the lobby', async () => {
      const t = await fullTable();

      t.h.drop(t.nimue);
      vi.advanceTimersByTime(DISCONNECT_SETTLE_MS);

      expect(matchStateOf(t.merlin)?.autoStartAt).toBeNull();
      expect(matchStateOf(t.merlin)?.roster.map((entry) => [entry.name, entry.joined])).toEqual([
        ['Morgana', true],
        ['Merlin', true],
        ['Nimue', false],
      ]);
      expect(t.h.tournamentAlarm.at).toBe(TEST_NOW + TOURNAMENT_TIMING.NO_SHOW_GRACE_MS);
    });
  });

  describe('no-shows', () => {
    it('should seat bots for absent members at the deadline and refuse their late tickets', async () => {
      const room = await matchRoom();
      const merlin = await seat(room, 'aaaaaaa', ticketClaims('user-a'));

      await room.h.fireAlarm('tournament');

      expect(room.h.game.phase).not.toBe(GamePhase.LOBBY);
      expect(room.h.game.players.map((player) => player.isBot)).toEqual([true, false, true]);
      expect(matchStateOf(merlin)?.roster.map((entry) => [entry.name, entry.noShow])).toEqual([
        ['Morgana', true],
        ['Merlin', false],
        ['Nimue', true],
      ]);

      const late = await seat(room, 'bbbbbbb', ticketClaims('user-b'));
      expect(refusalCodesOf(late)).toEqual([NO_SHOW]);
    });

    it('should forfeit the whole table when nobody is left at the deadline', async () => {
      const room = await matchRoom();
      const merlin = await seat(room, 'aaaaaaa', ticketClaims('user-a'));
      room.h.send(merlin, { type: ClientCommandType.LEAVE_GAME });

      await room.h.fireAlarm('tournament');

      expect(room.h.game.phase).toBe(GamePhase.LOBBY);
      expect(room.results.reports).toHaveLength(1);
      expect(room.results.reports[0].standings.every((standing) => standing.noShow && standing.placement === 3)).toBe(true);
      expect(room.h.tournamentAlarm.at).toBeNull();
    });

    it('should count members restored after a restart who never came back as no-shows', async () => {
      const first = await matchRoom();
      await seat(first, 'aaaaaaa', ticketClaims('user-a'));

      const restarted = await restartMatchRoom(first);
      await restarted.h.fireAlarm('tournament');

      // Nobody is at the table: it forfeits instead of playing an all-bot game in their names.
      expect(restarted.h.game.phase).toBe(GamePhase.LOBBY);
      expect(restarted.results.reports).toHaveLength(1);
      expect(restarted.results.reports[0].standings.every((standing) => standing.noShow)).toBe(true);
    });

    it('should let a bot play a member who is seated but disconnected at the start', async () => {
      const t = await fullTable();
      t.h.drop(t.nimue);
      vi.advanceTimersByTime(DISCONNECT_SETTLE_MS);

      await t.h.fireAlarm('tournament');
      await playToEnd(t.h);

      const nimue = t.results.reports[0].standings.find((standing) => standing.uid === 'user-c');
      expect(nimue).toMatchObject({ noShow: false, botTakeover: true });
    });
  });

  describe('result', () => {
    it('should report the attested result once when the game ends', async () => {
      const t = await fullTable({ bots: 1 });
      await t.h.fireAlarm('tournament');

      await playToEnd(t.h);
      t.h.send(t.merlin, { type: ClientCommandType.REQUEST_STATE });
      t.h.send(t.merlin, { type: ClientCommandType.SEND_EMOTE, emoteId: 'thumbs_up' });

      expect(t.results.reports).toHaveLength(1);
      const [report] = t.results.reports;
      expect(parseMatchResultReport(JSON.parse(JSON.stringify(report)))).toEqual(report);
      expect(report.standings.map((standing) => standing.uid)).toEqual(['user-b', 'user-a', 'user-c']);
      expect(report.standings.every((standing) => !standing.noShow && !standing.botTakeover && standing.rounds.length === 1)).toBe(true);
      const seatNames: Record<string, string> = { 'user-a': 'Merlin', 'user-b': 'Morgana', 'user-c': 'Nimue' };
      for (const standing of report.standings) {
        const player = t.h.game.players.find((candidate) => candidate.name === seatNames[standing.uid]);
        const better = t.h.game.players.filter((other) => other.score > (player?.score ?? 0)).length;
        expect(standing.score).toBe(player?.score);
        expect(standing.placement).toBe(better + 1);
      }
      expect(matchStateOf(t.merlin)?.reported).toBe(true);
    });

    it('should refuse a rematch after the match', async () => {
      const t = await fullTable();
      await t.h.fireAlarm('tournament');
      await playToEnd(t.h);
      t.merlin.clear();

      t.h.send(t.merlin, { type: ClientCommandType.REQUEST_REMATCH });

      expect(refusalCodesOf(t.merlin)).toEqual([MATCH_LOCKED]);
      expect(t.h.game.phase).toBe(GamePhase.GAME_END);
    });

    it('should flag a seat a bot finished after a mid-game disconnect', async () => {
      const t = await fullTable();
      await t.h.fireAlarm('tournament');
      t.h.drop(t.morgana);
      vi.advanceTimersByTime(DISCONNECT_SETTLE_MS);

      await playToEnd(t.h);

      expect(t.results.reports[0].standings.find((standing) => standing.uid === 'user-b')).toMatchObject({ botTakeover: true, noShow: false });
    });
  });

  describe('progress pings', () => {
    it('should ping when the game starts and at every round end, and never after the result', async () => {
      const t = await fullTable({ rulesetConfig: TWO_ROUND_RULESET });
      expect(t.results.pings).toEqual([]);

      await t.h.fireAlarm('tournament');
      const startedAt = Date.now();
      expect(t.results.pings.map((ping) => [ping.round, ping.maxRounds, ping.at])).toEqual([[1, 2, startedAt]]);
      expect(parseMatchProgressReport(JSON.parse(JSON.stringify(t.results.pings[0])))).toEqual(t.results.pings[0]);

      while (t.h.game.phase !== GamePhase.ROUND_END) await step(t.h);
      expect(t.results.pings.map((ping) => ping.round)).toEqual([1, 2]);
      t.h.send(t.merlin, { type: ClientCommandType.REQUEST_STATE });
      expect(t.results.pings).toHaveLength(2);

      await playToEnd(t.h);
      expect(t.results.reports).toHaveLength(1);
      expect(t.results.pings).toHaveLength(2);
    });

    it('should ping again while a long round is played, at most once per heartbeat', async () => {
      const t = await fullTable({ rulesetConfig: TWO_ROUND_RULESET });
      await t.h.fireAlarm('tournament');
      const startedAt = Date.now();
      await step(t.h);
      expect(t.results.pings).toHaveLength(1);

      const heartbeatAt = Date.now() + TOURNAMENT_TIMING.MATCH_PROGRESS_HEARTBEAT_MS;
      vi.setSystemTime(heartbeatAt);
      await step(t.h);
      expect(t.results.pings.map((ping) => [ping.round, ping.at])).toEqual([
        [1, startedAt],
        [1, heartbeatAt],
      ]);

      await step(t.h);
      expect(t.results.pings).toHaveLength(2);
    });

    it('should not claim activity for a game merely restored after a restart', async () => {
      const first = await fullTable({ rulesetConfig: TWO_ROUND_RULESET });
      await first.h.fireAlarm('tournament');
      await settle();
      vi.setSystemTime(Date.now() + TOURNAMENT_TIMING.MATCH_PROGRESS_HEARTBEAT_MS);

      const restarted = await restartMatchRoom(first);

      expect(restarted.results.pings).toEqual([]);
    });

    it('should not ping again for a round end restored after a restart', async () => {
      const first = await fullTable({ rulesetConfig: TWO_ROUND_RULESET });
      await first.h.fireAlarm('tournament');
      while (first.h.game.phase !== GamePhase.ROUND_END) await step(first.h);
      await settle();

      const restarted = await restartMatchRoom(first);
      expect(restarted.results.pings).toEqual([]);
    });

    it('should stop pinging once the match deadline passed', async () => {
      const deadlineAt = TEST_NOW + 60_000;
      const t = await fullTable({ rulesetConfig: TWO_ROUND_RULESET, deadlineAt });
      await t.h.fireAlarm('tournament');
      expect(t.results.pings).toHaveLength(1);

      vi.setSystemTime(deadlineAt);
      while (t.h.game.phase !== GamePhase.ROUND_END) await step(t.h);

      expect(t.results.pings).toHaveLength(1);
    });
  });

  describe('server outcome', () => {
    it('should keep and show a result the tournament answered as superseded', async () => {
      const t = await fullTable();
      await t.h.fireAlarm('tournament');
      await playToEnd(t.h);
      expect(matchStateOf(t.merlin)).toMatchObject({ reported: true, reportOutcome: null });

      t.results.answer('superseded');

      expect(matchStateOf(t.merlin)?.reportOutcome).toBe('superseded');
      expect(matchStateOf(t.nimue)?.reportOutcome).toBe('superseded');
      expect(t.h.storage.data.get(TOURNAMENT_MATCH_STORAGE_KEY)).toMatchObject({ reportOutcome: 'superseded' });

      // Kept with the lock, so the table still says so after a restart.
      expect(parseMatchRecord(t.h.storage.data.get(TOURNAMENT_MATCH_STORAGE_KEY))?.reportOutcome).toBe('superseded');
    });

    it('should show a result the tournament refused for good as not counted', async () => {
      const t = await fullTable();
      await t.h.fireAlarm('tournament');
      await playToEnd(t.h);

      t.results.answer('rejected');

      expect(matchStateOf(t.merlin)?.reportOutcome).toBe('rejected');
      expect(parseMatchRecord(t.h.storage.data.get(TOURNAMENT_MATCH_STORAGE_KEY))?.reportOutcome).toBe('rejected');
    });
  });

  describe('match deadline', () => {
    it('should send the deadline with the room state', async () => {
      const deadlineAt = TEST_NOW + 2 * 60 * 60 * 1000;
      const room = await matchRoom();
      const merlin = await seat(room, 'aaaaaaa', ticketClaims('user-a', { deadlineAt }));

      expect(matchStateOf(merlin)).toMatchObject({ deadlineAt, expired: false });
    });

    it('should never start a table after its deadline: the tournament voided it already', async () => {
      const deadlineAt = TEST_NOW + 60_000;
      const room = await matchRoom();
      const merlin = await seat(room, 'aaaaaaa', ticketClaims('user-a', { deadlineAt }));
      expect(room.h.tournamentAlarm.at).toBe(deadlineAt);

      await room.h.fireAlarm('tournament');

      expect(room.h.game.phase).toBe(GamePhase.LOBBY);
      expect(room.h.game.players.every((player) => !player.isBot)).toBe(true);
      expect(room.results.reports).toEqual([]);
      expect(room.results.pings).toEqual([]);
      expect(matchStateOf(merlin)).toMatchObject({ expired: true, autoStartAt: null, noShowDeadlineAt: null });
      expect(room.h.tournamentAlarm.at).toBeNull();
    });

    it('should not start a full table whose countdown ends after the deadline', async () => {
      const t = await fullTable({ deadlineAt: TEST_NOW + 5_000 });
      expect(t.h.tournamentAlarm.at).toBe(TEST_NOW + 5_000);

      await t.h.fireAlarm('tournament');

      expect(t.h.game.phase).toBe(GamePhase.LOBBY);
      expect(matchStateOf(t.merlin)?.expired).toBe(true);
    });
  });

  describe('round advance', () => {
    it('should move a finished round on by itself when the host does not', async () => {
      const t = await fullTable({ rulesetConfig: TWO_ROUND_RULESET });
      await t.h.fireAlarm('tournament');
      while (t.h.game.phase !== GamePhase.ROUND_END) await step(t.h);
      const endedAt = Date.now();

      expect(t.h.tournamentAlarm.at).toBe(endedAt + TOURNAMENT_ROOM_TIMING.ROUND_END_AUTO_ADVANCE_MS);
      await t.h.fireAlarm('tournament');

      expect(t.h.game.currentRound).toBe(2);
      expect(t.h.game.phase).not.toBe(GamePhase.ROUND_END);
    });
  });

  describe('restart', () => {
    it('should restore the lock, its deadline and the seats after the object was evicted', async () => {
      const first = await matchRoom();
      await seat(first, 'aaaaaaa', ticketClaims('user-a'));

      const restarted = await restartMatchRoom(first);
      const back = await seat(restarted, 'aaaaaaa', ticketClaims('user-a'));

      expect(refusalCodesOf(back)).toEqual([]);
      expect(restarted.h.tournamentAlarm.at).toBe(TEST_NOW + TOURNAMENT_TIMING.NO_SHOW_GRACE_MS);
      expect(matchStateOf(back)?.roster.find((entry) => entry.name === 'Merlin')?.joined).toBe(true);
    });

    it('should keep the match rules when the object restarts with an empty lobby', async () => {
      const first = await matchRoom();
      const merlin = await seat(first, 'aaaaaaa', ticketClaims('user-a', { rulesetConfig: TWO_ROUND_RULESET }));
      first.h.send(merlin, { type: ClientCommandType.LEAVE_GAME });
      await settle();
      expect(first.h.game.players).toHaveLength(0);

      const restarted = await restartMatchRoom(first);
      expect(restarted.h.game.rulesetConfig.structure.customRoundCount).toBe(2);
      const back = await seat(restarted, 'aaaaaaa', ticketClaims('user-a', { rulesetConfig: TWO_ROUND_RULESET }));
      await restarted.h.fireAlarm('tournament');

      expect(refusalCodesOf(back)).toEqual([]);
      expect(restarted.h.game.phase).not.toBe(GamePhase.LOBBY);
      expect(restarted.h.game.maxRounds).toBe(2);
    });

    it('should start with the match rules even when the lobby lost them', async () => {
      const room = await matchRoom();
      await seat(room, 'aaaaaaa', ticketClaims('user-a', { rulesetConfig: TWO_ROUND_RULESET }));
      room.h.game.setRulesetConfig(DEFAULT_RULESET_CONFIG);

      await room.h.fireAlarm('tournament');

      expect(room.h.game.phase).not.toBe(GamePhase.LOBBY);
      expect(room.h.game.maxRounds).toBe(2);
    });

    it('should report a finished game a crash left unreported, and only that once', async () => {
      const first = await fullTable();
      await first.h.fireAlarm('tournament');
      await playToEnd(first.h);
      const { storage } = first.h;
      const record = storage.data.get(TOURNAMENT_MATCH_STORAGE_KEY) as Record<string, unknown>;
      storage.data.set(TOURNAMENT_MATCH_STORAGE_KEY, { ...record, reportedAt: null });

      const restarted = await restartMatchRoom(first);
      const again = await restartMatchRoom(restarted);

      expect(restarted.results.reports.map((report) => report.mid)).toEqual([first.results.reports[0].mid]);
      expect(again.results.reports).toHaveLength(0);
    });
  });
});
