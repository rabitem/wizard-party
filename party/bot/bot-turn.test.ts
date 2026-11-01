import { afterEach, describe, expect, it, vi } from 'vitest';
import { CardType, GameEventType, GamePhase } from '../../shared/domain';
import { processBotTurn } from './bot-turn';
import { NOOP_TELEMETRY } from '../telemetry';

describe('processBotTurn scheduling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports the move and leaves the next turn to the room scheduler', () => {
    const ctx = {
      game: {
        phase: GamePhase.PLAYING,
        players: [
          { id: 'bot-player', isBot: true },
          { id: 'next-bot', isBot: true },
        ],
        getPlayer: (id: string) => id === 'bot-player'
          ? { id: 'bot-player', isBot: true, hand: [{ id: 'card-1', type: CardType.NUMBER }] }
          : { id, isBot: id !== 'human-player', hand: [] },
      },
      telemetry: NOOP_TELEMETRY,
      useCases: {
        botTurn: {
          execute: vi.fn(() => ({ type: 'PLAY_CARD', playerId: 'bot-player', cardId: 'card-1' })),
        },
        playCard: {
          execute: vi.fn(() => ({
            cardPlayedEvent: {
              type: GameEventType.CARD_PLAYED,
              timestamp: 1,
              playerId: 'bot-player',
              card: { id: 'card-1', type: CardType.NUMBER },
              nextPlayerId: 'next-bot',
            },
            trickCompleteEvent: {
              type: GameEventType.TRICK_COMPLETE,
              timestamp: 2,
              winnerId: 'next-bot',
              trickIndex: 0,
              trickCards: [],
            },
            effectEvents: [],
          })),
        },
      },
      playerSoundPreferences: new Map(),
      broadcast: vi.fn(),
      broadcastPersonalizedState: vi.fn(),
      saveState: vi.fn(),
    };

    expect(processBotTurn(ctx as never)).toBe('acted');
    expect(ctx.broadcastPersonalizedState).toHaveBeenCalledTimes(1);
  });

  it('reports a turn that could not be made at all, so the room retries it', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const ctx = {
      game: { phase: GamePhase.PLAYING },
      telemetry: NOOP_TELEMETRY,
      useCases: {
        botTurn: {
          execute: vi.fn(() => {
            throw new Error('brain crashed');
          }),
          getActingBot: vi.fn(() => ({ id: 'bot-player', isBot: true })),
        },
      },
      broadcastPersonalizedState: vi.fn(),
      saveState: vi.fn(),
    };

    expect(processBotTurn(ctx as never)).toBe('failed');
    expect(ctx.broadcastPersonalizedState).not.toHaveBeenCalled();
  });
});

describe('processBotTurn recovery', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  type PlayInput = { cardId: string };

  /** A playing bot with two legal cards; `isApplied` says whether card-1 already left its hand. */
  function recoveryContext(playCard: (input: PlayInput) => unknown, isApplied: () => boolean) {
    const chosen = { type: 'PLAY_CARD', playerId: 'bot-player', cardId: 'card-1' };
    const fallback = { ...chosen, cardId: 'card-2', fallbackReason: 'forced' };
    return {
      game: {
        phase: GamePhase.PLAYING,
        players: [{ id: 'bot-player', isBot: true }],
        getPlayer: () => ({ id: 'bot-player', isBot: true, hand: [] }),
        getLegalPlays: () => (isApplied() ? [{ id: 'card-2' }] : [{ id: 'card-1' }, { id: 'card-2' }]),
        getDeclarationError: () => null,
      },
      telemetry: NOOP_TELEMETRY,
      useCases: {
        botTurn: {
          execute: vi.fn((input: { forceFallback?: boolean }) => (input.forceFallback ? fallback : chosen)),
        },
        playCard: { execute: vi.fn(playCard) },
      },
      playerSoundPreferences: new Map(),
      broadcast: vi.fn(),
      broadcastPersonalizedState: vi.fn(),
      saveState: vi.fn(),
    };
  }

  const playedResult = (cardId: string) => ({
    cardPlayedEvent: {
      type: GameEventType.CARD_PLAYED,
      timestamp: 1,
      playerId: 'bot-player',
      card: { id: cardId, type: CardType.NUMBER },
      nextPlayerId: null,
    },
    effectEvents: [],
  });

  it('takes the legal fallback once when the chosen action never reached the game', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const ctx = recoveryContext((input) => {
      if (input.cardId === 'card-1') throw new Error('use case failed');
      return playedResult(input.cardId);
    }, () => false);

    expect(processBotTurn(ctx as never)).toBe('acted');

    expect(ctx.useCases.playCard.execute.mock.calls.map(([input]) => input.cardId)).toEqual(['card-1', 'card-2']);
    expect(ctx.useCases.botTurn.execute).toHaveBeenLastCalledWith(expect.objectContaining({ forceFallback: true }));
    expect(ctx.broadcastPersonalizedState).toHaveBeenCalledTimes(1);
  });

  it('publishes an applied action instead of making a second move when only the broadcast failed', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let applied = false;
    const ctx = recoveryContext((input) => {
      applied = true;
      return playedResult(input.cardId);
    }, () => applied);
    ctx.broadcast.mockImplementationOnce(() => {
      throw new Error('broadcast failed');
    });

    expect(processBotTurn(ctx as never)).toBe('acted');

    expect(ctx.useCases.playCard.execute).toHaveBeenCalledTimes(1);
    expect(ctx.useCases.botTurn.execute).toHaveBeenCalledTimes(1);
    expect(ctx.broadcastPersonalizedState).toHaveBeenCalledTimes(1);
    expect(ctx.saveState).toHaveBeenCalledTimes(1);
  });
});
