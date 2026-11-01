import { describe, expect, it } from 'vitest';
import {
  Game,
  GamePhase,
  Player,
  Suit,
  createManualClock,
  createSeededRandom,
  ensureRulesetConfig,
} from '../../../domain';
import { TurnTimeoutUseCase } from './turn-timeout.use-case';
import { NextRoundUseCase } from './next-round.use-case';

const TIMER_SECONDS = 10;

function timedBidding() {
  const clock = createManualClock(1_000);
  const game = new Game('timeout', 'h', { clock, random: createSeededRandom(7) });
  game.setRulesetConfig(ensureRulesetConfig({ turn: { biddingTimerSeconds: TIMER_SECONDS } }));
  ['h', 'p', 'q'].forEach((id) => game.addPlayer(new Player(id, id)));
  game.start();
  if (game.phase === GamePhase.TRUMP_SELECTION) {
    const chooser = game.getTrumpChooser();
    if (chooser) game.selectTrump(chooser.id, Suit.GIANTS);
  }
  return { game, clock };
}

describe('TurnTimeoutUseCase', () => {
  const timeout = new TurnTimeoutUseCase();

  it('makes no move before the timer ran out', () => {
    const { game } = timedBidding();
    expect(timeout.execute({ game })).toEqual({ type: 'NONE' });
  });

  it('bids for the timed-out player with the lowest allowed bid', () => {
    const { game, clock } = timedBidding();
    const timeOut = () => {
      clock.advance(TIMER_SECONDS * 1000);
      game.expireTurnTimer();
      return timeout.execute({ game });
    };

    // The first bidder may bid anything, so the lowest allowed bid is 0.
    const first = game.getCurrentPlayer();
    expect(timeOut()).toEqual({ type: 'PLACE_BID', playerId: first.id, bid: 0 });

    // Round 1 deals one card; with 1 + 0 bid, the hook rule forbids the last bidder a 0.
    game.placeBid(first.id, 1);
    game.placeBid(game.getCurrentPlayer().id, 0);
    const last = game.getCurrentPlayer();
    expect(game.getForbiddenBidFor(last.id)).toBe(0);
    expect(timeOut()).toEqual({ type: 'PLACE_BID', playerId: last.id, bid: 1 });
  });

  it('makes no move while the table is paused or for a bot', () => {
    const { game, clock } = timedBidding();
    clock.advance(TIMER_SECONDS * 1000);
    game.expireTurnTimer();
    const current = game.getCurrentPlayer();

    current.handOverToBot();
    expect(timeout.execute({ game })).toEqual({ type: 'NONE' });

    current.reclaimByHuman(current.id);
    game.pause('q', 'q');
    expect(timeout.execute({ game })).toEqual({ type: 'NONE' });
  });
});

describe('NextRoundUseCase.executeOnTimeout', () => {
  const nextRound = new NextRoundUseCase();

  it('advances ROUND_END without a host, but never a paused table or another phase', () => {
    const { game } = timedBidding();
    expect(nextRound.executeOnTimeout({ game })).toBeNull();

    game.phase = GamePhase.ROUND_END;
    game.pause('q', 'q');
    expect(nextRound.executeOnTimeout({ game })).toBeNull();

    game.resume();
    const result = nextRound.executeOnTimeout({ game });
    expect(result?.trumpRevealedEvent).toBeDefined();
    expect(game.currentRound).toBe(2);
    expect(game.roundEndedAt).toBeNull();
  });
});
