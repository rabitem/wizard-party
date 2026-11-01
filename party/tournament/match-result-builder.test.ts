import { describe, expect, it } from 'vitest';

import { Game, GamePhase, Player } from '../../shared/domain';
import { parseMatchProgressReport, parseMatchResultReport } from '../../shared/tournament';
import { bindSeat, lockMatchRecord, updateSeat, type TournamentMatchRecord } from './match-record';
import { buildForfeitReport, buildMatchProgressReport, buildMatchResultReport, matchGameId } from './match-result-builder';
import { TEST_NOW, TEST_ROOM, ticketClaims } from './tournament-test-support';

function finishedTable(scores: Record<string, number>): { game: Game; record: TournamentMatchRecord } {
  const game = new Game(TEST_ROOM, 'p-a');
  game.phase = GamePhase.GAME_END;
  for (const [id, score] of Object.entries(scores)) {
    const player = new Player(id, id === 'bot-1' ? 'WizardBot' : `Player ${id}`, id.startsWith('bot'));
    player.score = score;
    player.roundHistory = [{ bid: 1, tricksWon: 1, score }];
    game.players.push(player);
  }
  let record: TournamentMatchRecord = { ...lockMatchRecord(ticketClaims('user-a', { bots: 1 }), TEST_NOW), startedAt: TEST_NOW };
  record = bindSeat(record, 'user-a', 'p-a', TEST_NOW);
  record = bindSeat(record, 'user-b', 'p-b', TEST_NOW);
  record = bindSeat(record, 'user-c', 'p-c', TEST_NOW);
  return { game, record };
}

describe('match result builder', () => {
  it('should rank every seat, bots included, and report only the members', () => {
    const { game, record } = finishedTable({ 'p-a': 40, 'bot-1': 90, 'p-b': 40, 'p-c': -10 });

    const report = buildMatchResultReport(record, game, TEST_NOW + 1);

    expect(report.standings.map((standing) => [standing.uid, standing.placement, standing.score])).toEqual([
      ['user-b', 2, 40],
      ['user-a', 2, 40],
      ['user-c', 4, -10],
    ]);
    expect(report.standings[0].rounds).toEqual([{ bid: 1, tricksWon: 1, roundScore: 40 }]);
    expect(report.gameId).toBe(matchGameId(record));
    expect(parseMatchResultReport(JSON.parse(JSON.stringify(report)))).toEqual(report);
  });

  it('should rank a no-show last with no score whatever their bot scored', () => {
    const { game, record } = finishedTable({ 'p-a': 10, 'bot-1': 0, 'p-b': 20, 'bot-2': 300 });
    const withNoShow = updateSeat(record, 'user-c', { noShow: true, playerId: 'bot-2' });

    const report = buildMatchResultReport(withNoShow, game, TEST_NOW);
    const noShow = report.standings.find((standing) => standing.uid === 'user-c');

    expect(noShow).toEqual({ uid: 'user-c', placement: 4, score: 0, rounds: [], noShow: true, botTakeover: false });
    expect(report.standings.find((standing) => standing.uid === 'user-b')?.placement).toBe(1);
  });

  it('should flag seats a bot finished', () => {
    const { game, record } = finishedTable({ 'p-a': 10, 'bot-1': 0, 'p-b': 20, 'p-c': 30 });

    const report = buildMatchResultReport(updateSeat(record, 'user-a', { botTakeover: true }), game, TEST_NOW);

    expect(report.standings.find((standing) => standing.uid === 'user-a')).toMatchObject({ botTakeover: true, noShow: false, placement: 3 });
  });

  it('should forfeit every member when nobody was seated', () => {
    const { record } = finishedTable({});

    const report = buildForfeitReport(record, TEST_NOW);

    expect(report.standings).toEqual([
      { uid: 'user-b', placement: 4, score: 0, rounds: [], noShow: true, botTakeover: false },
      { uid: 'user-a', placement: 4, score: 0, rounds: [], noShow: true, botTakeover: false },
      { uid: 'user-c', placement: 4, score: 0, rounds: [], noShow: true, botTakeover: false },
    ]);
    expect(parseMatchResultReport(report)).not.toBeNull();
  });

  it('should build a progress ping the server parses, never beyond the last round', () => {
    const { record } = finishedTable({ 'p-a': 0 });

    const ping = buildMatchProgressReport(record, { round: 3, maxRounds: 10 }, TEST_NOW + 5);

    expect(ping).toEqual({
      v: 1,
      kind: 'progress',
      tid: record.tid,
      mid: record.mid,
      room: record.room,
      gameId: matchGameId(record),
      round: 3,
      maxRounds: 10,
      at: TEST_NOW + 5,
    });
    expect(parseMatchProgressReport(JSON.parse(JSON.stringify(ping)))).toEqual(ping);
    expect(buildMatchProgressReport(record, { round: 11, maxRounds: 10 }, TEST_NOW).round).toBe(10);
  });
});
