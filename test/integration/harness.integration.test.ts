import { afterEach, describe, expect, it } from 'vitest';
import { GamePhase } from '@shared/domain';
import { ruleset } from '../../party/test-support/table-driver';
import { FullStackTable } from './support/full-stack-table';
import { view } from './support/screen-model';

/**
 * Proof of the level-4 harness itself: real clients reach the real room over the shaped network,
 * the driver can play a whole game through what the screens offer, and I1-I6 hold at every rest
 * (settle checks them). The flows themselves are owned by the other integration suites.
 */
describe('full-stack table', () => {
  let table: FullStackTable | null = null;

  afterEach(() => {
    table?.dispose();
    table = null;
  });

  it('seats two browsers and a bot, and every screen follows the room from the lobby to the results', async () => {
    const created = await FullStackTable.create({ seed: 11, network: { latencyMs: 30, jitterMs: 20 } });
    table = created;
    const ann = created.open(created.browser(), 'Ann');
    await ann.join({ name: 'Harness table', isPublic: false, maxPlayers: 6, rulesetConfig: ruleset({ rounds: 1 }) });
    const ben = created.open(created.browser(), 'Ben');
    await ben.join();

    ann.addBot(2);
    await created.settle();
    for (const player of [ann, ben]) {
      const lobby = view(player).lobby;
      expect(lobby?.seats.map((seat) => seat.name).slice(0, 2)).toEqual(['Ann', 'Ben']);
      expect(lobby?.seats.filter((seat) => seat.isBot)).toHaveLength(1);
      expect(lobby?.isHost).toBe(player === ann);
      expect(view(player).page).toBe(`/lobby/${created.roomId}`);
    }

    ann.start();
    await created.settle();
    expect(created.server.game.phase).not.toBe(GamePhase.LOBBY);
    for (const player of [ann, ben]) expect(view(player).page).toBe(`/game/${created.roomId}`);

    await created.playUntil(() => created.server.game.phase === GamePhase.GAME_END);
    const finalScores = created.server.game.players.map((player) => [player.id, player.score]);
    for (const player of [ann, ben]) {
      const screen = view(player);
      expect(screen.page).toBe(`/results/${created.roomId}`);
      expect(screen.table?.standings.players.map((seat) => [seat.id, seat.score])).toEqual(finalScores);
      expect(player.table.presentedTricks).toBe(1);
    }
  });
});
