import { describe, expect, it } from 'vitest';

import {
  Card,
  CardType,
  DEFAULT_RULESET_CONFIG,
  Game,
  GamePhase,
  ensureRoomSettings,
  Player,
  Suit,
  Trick,
  createManualClock,
} from '../../domain';

type RulesetOverrides = {
  card?: Partial<typeof DEFAULT_RULESET_CONFIG.card>;
  bidding?: Partial<typeof DEFAULT_RULESET_CONFIG.bidding>;
  scoring?: Partial<typeof DEFAULT_RULESET_CONFIG.scoring>;
  structure?: Partial<typeof DEFAULT_RULESET_CONFIG.structure>;
  turn?: Partial<typeof DEFAULT_RULESET_CONFIG.turn>;
  expansions?: Partial<typeof DEFAULT_RULESET_CONFIG.expansions>;
};

function ruleset(overrides: RulesetOverrides): typeof DEFAULT_RULESET_CONFIG {
  return {
    card: { ...DEFAULT_RULESET_CONFIG.card, ...overrides.card },
    bidding: { ...DEFAULT_RULESET_CONFIG.bidding, ...overrides.bidding },
    scoring: { ...DEFAULT_RULESET_CONFIG.scoring, ...overrides.scoring },
    structure: { ...DEFAULT_RULESET_CONFIG.structure, ...overrides.structure },
    turn: { ...DEFAULT_RULESET_CONFIG.turn, ...overrides.turn },
    expansions: { ...DEFAULT_RULESET_CONFIG.expansions, ...overrides.expansions },
  };
}

function createPlayer(id: string, card: Card): Player {
  const player = new Player(id, id);
  player.receiveCards([card]);
  return player;
}

const START = 1_700_000_000_000;

describe('Game ruleset application', () => {
  it('validates bids against dealt card count in descending rounds', () => {
    const game = new Game('descending-bids', 'p1');
    game.setRulesetConfig(ruleset({
      structure: {
        customRoundCount: 5,
        descendingRounds: true,
      },
      bidding: {
        allowEqualBids: true,
      },
    }));
    game.addPlayer(new Player('p1', 'Merlin'));
    game.addPlayer(new Player('p2', 'Morgana'));
    game.addPlayer(new Player('p3', 'Galahad'));

    game.start();
    if (game.phase === GamePhase.TRUMP_SELECTION) {
      game.selectTrump(game.getDealer().id, Suit.HUMANS);
    }

    expect(game.players[1].hand.length).toBe(5);
    game.placeBid(game.players[1].id, 5);

    expect(game.players[1].bid).toBe(5);
  });

  it('applies custom scoring values when a round completes', () => {
    const game = new Game('custom-scoring', 'p1');
    game.setRulesetConfig(ruleset({
      scoring: {
        baseBidPoints: 50,
        pointsPerTrick: 5,
        penaltyPerMiss: 7,
      },
    }));
    game.players = [
      createPlayer('p1', new Card('p1-card', CardType.NUMBER, Suit.GIANTS, 13)),
      createPlayer('p2', new Card('p2-card', CardType.NUMBER, Suit.GIANTS, 2)),
      createPlayer('p3', new Card('p3-card', CardType.NUMBER, Suit.GIANTS, 3)),
    ];
    game.phase = GamePhase.PLAYING;
    game.currentRound = 1;
    game.maxRounds = 1;
    game.currentPlayerIndex = 0;
    game.currentTrick = new Trick(null);
    game.players[0].placeBid(1);
    game.players[1].placeBid(0);
    game.players[2].placeBid(0);

    game.playCard('p1', 'p1-card');
    game.playCard('p2', 'p2-card');
    game.playCard('p3', 'p3-card');

    expect(game.phase).toBe(GamePhase.GAME_END);
    expect(game.players.map((player) => player.score)).toEqual([55, 50, 50]);
    expect(game.players.map((player) => player.roundHistory[0]?.score)).toEqual([55, 50, 50]);
  });

  it('starts and expires the configured turn timer for bidding turns', () => {
    const clock = createManualClock(START);
    const game = new Game('turn-timer-bidding', 'p1', { clock });
    game.setRulesetConfig(ruleset({ turn: { biddingTimerSeconds: 10, playTimerSeconds: 7 } }));
    game.addPlayer(new Player('p1', 'Merlin'));
    game.addPlayer(new Player('p2', 'Morgana'));
    game.addPlayer(new Player('p3', 'Galahad'));

    game.start();
    const expectedTargetId = game.phase === GamePhase.TRUMP_SELECTION
      ? game.getDealer().id
      : game.getCurrentPlayer().id;

    expect(game.turnTimerState).toMatchObject({
      playerId: expectedTargetId,
      durationMs: 10_000,
      expired: false,
      sequence: 1,
    });
    expect(game.turnTimerState?.expiresAt).toBe(START + 10_000);

    clock.advance(10_000);
    const expired = game.expireTurnTimer();

    expect(expired).toMatchObject({
      playerId: expectedTargetId,
      expired: true,
    });
    expect(game.turnTimerState?.expired).toBe(true);
  });

  it('restarts the turn timer when a player advances the turn', () => {
    const clock = createManualClock(START);
    const game = new Game('turn-timer-restart', 'p1', { clock });
    game.setRulesetConfig(ruleset({
      bidding: { allowEqualBids: true },
      turn: { biddingTimerSeconds: 12, playTimerSeconds: 8 },
    }));
    game.players = [
      createPlayer('p1', new Card('p1-card', CardType.NUMBER, Suit.GIANTS, 1)),
      createPlayer('p2', new Card('p2-card', CardType.NUMBER, Suit.ELVES, 1)),
      createPlayer('p3', new Card('p3-card', CardType.NUMBER, Suit.DWARVES, 1)),
    ];
    game.phase = GamePhase.BIDDING;
    game.currentRound = 1;
    game.maxRounds = 1;
    game.currentPlayerIndex = 0;
    game.syncTurnTimerState();
    const firstSequence = game.turnTimerState?.sequence;

    clock.advance(5_000);
    game.placeBid('p1', 0);

    expect(game.currentPlayerIndex).toBe(1);
    expect(game.turnTimerState).toMatchObject({
      playerId: 'p2',
      durationMs: 12_000,
      expired: false,
      sequence: (firstSequence ?? 0) + 1,
    });
    expect(game.turnTimerState?.startedAt).toBe(START + 5_000);
  });

  it('uses play timer duration once bidding advances to card play', () => {
    const clock = createManualClock(START);
    const game = new Game('turn-timer-play', 'p1', { clock });
    game.setRulesetConfig(ruleset({
      bidding: { allowEqualBids: true },
      turn: { biddingTimerSeconds: 15, playTimerSeconds: 10 },
    }));
    game.players = [
      createPlayer('p1', new Card('p1-card', CardType.NUMBER, Suit.GIANTS, 1)),
      createPlayer('p2', new Card('p2-card', CardType.NUMBER, Suit.ELVES, 1)),
      createPlayer('p3', new Card('p3-card', CardType.NUMBER, Suit.DWARVES, 1)),
    ];
    game.phase = GamePhase.BIDDING;
    game.currentRound = 1;
    game.maxRounds = 1;
    game.currentPlayerIndex = 0;
    game.placeBid('p1', 0);
    game.placeBid('p2', 0);

    clock.advance(3_000);
    game.placeBid('p3', 0);

    expect(game.phase).toBe(GamePhase.PLAYING);
    expect(game.turnTimerState).toMatchObject({
      durationMs: 10_000,
      phase: GamePhase.PLAYING,
      expired: false,
    });
    expect(game.turnTimerState?.startedAt).toBe(START + 3_000);
  });
});

describe('room settings normalization', () => {
  it('repairs invalid room settings without preserving impossible player limits', () => {
    const settings = ensureRoomSettings({
      name: '  ',
      isPublic: 'yes',
      maxPlayers: 2,
      rulesetConfig: {
        bidding: {
          hiddenBids: true,
          allowEqualBids: 'no',
        },
      },
    });

    expect(settings).toMatchObject({
      name: '',
      isPublic: true,
      maxPlayers: 3,
      rulesetConfig: {
        bidding: {
          hiddenBids: true,
          allowEqualBids: false,
        },
      },
    });
  });

  it('uses fallback room settings for missing fields while keeping incoming valid overrides', () => {
    const settings = ensureRoomSettings(
      {
        name: '  Arcane Room  ',
        maxPlayers: 4,
      },
      {
        name: 'Fallback',
        isPublic: false,
        maxPlayers: 5,
        rulesetConfig: {
          ...DEFAULT_RULESET_CONFIG,
          card: {
            ...DEFAULT_RULESET_CONFIG.card,
            lastWizardWins: true,
          },
        },
      }
    );

    expect(settings.name).toBe('Arcane Room');
    expect(settings.isPublic).toBe(false);
    expect(settings.maxPlayers).toBe(4);
    expect(settings.rulesetConfig?.card.lastWizardWins).toBe(true);
  });

  it('drops a field room settings no longer have, such as the retired room password', () => {
    const settings = ensureRoomSettings({ name: 'Old client', isPublic: false, maxPlayers: 4, password: 'secret' });

    expect(settings).not.toHaveProperty('password');
    expect(settings).toMatchObject({ name: 'Old client', isPublic: false, maxPlayers: 4 });
  });
});
