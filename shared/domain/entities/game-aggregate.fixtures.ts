import { Game, GamePhase, Player, Suit, createManualClock, createSeededRandom } from '../index';

/* Shared setup for the Game aggregate tests: seeded, clocked games built through the aggregate. */

export const SEED = 20261029;

export function seededGame(seed = SEED, playerCount = 3): Game {
  const game = new Game('aggregate', 'p1', {
    random: createSeededRandom(seed),
    clock: createManualClock(1_000_000),
  });
  for (let i = 1; i <= playerCount; i++) {
    game.addPlayer(new Player(`p${i}`, `Player ${i}`));
  }
  return game;
}

/** Start the game and settle trump so the first round is in BIDDING. */
export function startInBidding(game: Game): void {
  game.start();
  if (game.phase === GamePhase.TRUMP_SELECTION) {
    const chooser = game.getTrumpChooser();
    if (!chooser) throw new Error('No trump chooser');
    game.selectTrump(chooser.id, Suit.ELVES);
  }
}
