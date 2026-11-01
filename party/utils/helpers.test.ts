import { afterEach, describe, expect, it, vi } from 'vitest';

import { Card, CardType, DEFAULT_RULESET_CONFIG, Game, GamePhase, Player, Suit } from '../../shared/domain';
import {
  createPersonalizedState,
  getSharedCustomSounds,
  getPlayerTrickWinCustomAudio,
  getPlayerTrickWinSound,
  normalizeCustomCardAudioChoice,
  normalizeTimeoutCustomAudioChoice,
  normalizeCardSoundChoice,
  normalizeSoundPreferences,
} from './helpers';
import { TRICK_WIN_SOUNDS } from './types';

describe('sound helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    // A random preference and an unknown persisted id both become a playable sound from the pool.
    ['random', TRICK_WIN_SOUNDS[0]],
    ['missing-sound-file', TRICK_WIN_SOUNDS[0]],
    ['trickWinChoir', 'trickWinChoir'],
  ])('resolves trick-win preference %s to %s', (preference, expected) => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(getPlayerTrickWinSound('player-1', new Map([['player-1', { trickWinSound: preference }]]))).toBe(expected);
  });

  it('maps retired sound ids from older clients and saved rooms to their successors', () => {
    expect(getPlayerTrickWinSound('player-1', new Map([['player-1', { trickWinSound: 'trickWinHallelujah' }]])))
      .toBe('trickWinChoir');
    expect(normalizeSoundPreferences({ trickWinSound: 'trickWinWinners' })).toEqual({ trickWinSound: 'trickWinJackpot' });
    expect(normalizeCardSoundChoice('jesterWasted')).toBe('jesterGameOver');
  });

  it('normalizes card landing sounds to wizard and jester effects only', () => {
    expect(normalizeCardSoundChoice('wizardAirhorn')).toBe('wizardAirhorn');
    expect(normalizeCardSoundChoice('jesterSadTrombone')).toBe('jesterSadTrombone');
    expect(normalizeCardSoundChoice('trickWinAirhorn')).toBeUndefined();
    expect(normalizeCardSoundChoice('missing-sound-file')).toBeUndefined();
    expect(normalizeCardSoundChoice(undefined)).toBeUndefined();
  });

  it('normalizes malformed sound preference payloads without throwing', () => {
    expect(normalizeSoundPreferences(undefined)).toEqual({});
    expect(normalizeSoundPreferences(null)).toEqual({});
    expect(normalizeSoundPreferences('trickWinAirhorn')).toEqual({});
    expect(normalizeSoundPreferences({ trickWinSound: 'wizardAirhorn' })).toEqual({});
    expect(normalizeSoundPreferences({ trickWinSound: 'trickWinAirhorn' })).toEqual({
      trickWinSound: 'trickWinAirhorn',
    });
  });

  it('normalizes and exposes valid custom trick-win audio preferences', () => {
    const customTrickWinAudio = {
      id: 'custom-1',
      name: 'win.ogg',
      dataUrl: 'data:audio/ogg;base64,AAAA',
      size: 256,
      duration: 2,
    };

    const preferences = normalizeSoundPreferences({ customTrickWinAudio });

    expect(preferences.customTrickWinAudio).toEqual(customTrickWinAudio);
    expect(getPlayerTrickWinCustomAudio(
      'player-1',
      new Map([['player-1', preferences]])
    )).toEqual(customTrickWinAudio);
  });

  it('normalizes trick-win custom audio pools and chooses from them', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const customTrickWinAudios = [
      {
        id: 'custom-1',
        name: 'win.ogg',
        dataUrl: 'data:audio/ogg;base64,AAAA',
        size: 256,
        duration: 2,
        category: 'custom',
        roles: { wizard: false, jester: false, trick: true, afk: false, shared: false },
      },
      {
        id: 'custom-2',
        name: 'wizard.ogg',
        dataUrl: 'data:audio/ogg;base64,BBBB',
        size: 256,
        duration: 2,
        category: 'custom',
        roles: { wizard: true, jester: false, trick: false, afk: false, shared: false },
      },
    ];

    const preferences = normalizeSoundPreferences({ customTrickWinAudios });

    expect(preferences.customTrickWinAudios).toEqual([customTrickWinAudios[0]]);
    expect(getPlayerTrickWinCustomAudio(
      'player-1',
      new Map([['player-1', preferences]])
    )).toEqual(customTrickWinAudios[0]);
  });

  it('randomly chooses among multiple custom trick-win sounds for the event', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.75);
    const customTrickWinAudios = [
      {
        id: 'custom-1',
        name: 'win-one.ogg',
        dataUrl: 'data:audio/ogg;base64,AAAA',
        size: 256,
        duration: 2,
        category: 'meme' as const,
        roles: { wizard: false, jester: false, trick: true, afk: false, shared: false },
      },
      {
        id: 'custom-2',
        name: 'win-two.ogg',
        dataUrl: 'data:audio/ogg;base64,BBBB',
        size: 256,
        duration: 2,
        category: 'sports' as const,
        roles: { wizard: false, jester: false, trick: true, afk: false, shared: false },
      },
    ];

    expect(getPlayerTrickWinCustomAudio(
      'player-1',
      new Map([['player-1', { customTrickWinAudios }]])
    )).toEqual(customTrickWinAudios[1]);
  });

  it('drops invalid custom trick-win audio preferences', () => {
    expect(normalizeSoundPreferences({
      customTrickWinAudio: {
        id: 'custom-1',
        name: 'too-large.ogg',
        dataUrl: 'data:audio/ogg;base64,AAAA',
        size: 3 * 1024 * 1024,
        duration: 2,
      },
    }).customTrickWinAudio).toBeUndefined();

    expect(normalizeSoundPreferences({
      customTrickWinAudio: {
        id: 'custom-1',
        name: 'not-audio.txt',
        dataUrl: 'data:text/plain;base64,AAAA',
        size: 256,
        duration: 2,
      },
    }).customTrickWinAudio).toBeUndefined();
  });

  it('normalizes custom card audio only for matching wizard and jester roles', () => {
    const customAudio = {
      id: 'custom-card',
      name: 'card.wav',
      dataUrl: 'data:audio/wav;base64,AAAA',
      size: 128,
      duration: 1,
      category: 'meme',
      roles: { wizard: true, jester: false, trick: false, afk: false, shared: false },
    };

    expect(normalizeCustomCardAudioChoice(customAudio, CardType.WIZARD)).toEqual(customAudio);
    expect(normalizeCustomCardAudioChoice(customAudio, CardType.JESTER)).toBeUndefined();
    expect(normalizeCustomCardAudioChoice(customAudio, CardType.NUMBER)).toBeUndefined();
  });

  it('normalizes timeout custom audio only for AFK board sounds', () => {
    const customAudio = {
      id: 'custom-afk',
      name: 'afk.wav',
      dataUrl: 'data:audio/wav;base64,AAAA',
      size: 128,
      duration: 1,
      category: 'meme',
      roles: { wizard: false, jester: false, trick: false, afk: true, shared: false },
    };

    expect(normalizeTimeoutCustomAudioChoice(customAudio)).toEqual(customAudio);
    expect(normalizeTimeoutCustomAudioChoice({
      ...customAudio,
      roles: { ...customAudio.roles, afk: false },
    })).toBeUndefined();
  });

  it('repairs unknown custom sound categories to the custom bucket', () => {
    expect(normalizeCustomCardAudioChoice({
      id: 'custom-card',
      name: 'card.wav',
      dataUrl: 'data:audio/wav;base64,AAAA',
      size: 128,
      duration: 1,
      category: 'not-real',
      roles: { wizard: true, jester: false, trick: false, afk: false, shared: false },
    }, CardType.WIZARD)?.category).toBe('custom');
  });

  it('normalizes and groups shared custom sounds by player', () => {
    const game = new Game('room-1', 'player-1');
    game.players = [
      new Player('player-1', 'Merlin'),
      new Player('player-2', 'Morgana'),
    ];
    const sharedSound = {
      id: 'shared-1',
      name: 'spell.wav',
      dataUrl: 'data:audio/wav;base64,AAAA',
      size: 128,
      duration: 1,
      category: 'football',
      roles: { wizard: false, jester: false, trick: false, afk: false, shared: true },
    };
    const localOnlySound = {
      id: 'local-only',
      name: 'private.wav',
      dataUrl: 'data:audio/wav;base64,BBBB',
      size: 128,
      duration: 1,
      category: 'custom',
      roles: { wizard: true, jester: false, trick: false, afk: false, shared: false },
    };

    const preferences = normalizeSoundPreferences({
      sharedCustomSounds: [sharedSound, localOnlySound],
    });

    expect(preferences.sharedCustomSounds).toEqual([sharedSound]);
    expect(getSharedCustomSounds(
      game,
      new Map([['player-2', preferences]])
    )).toEqual([
      {
        ...sharedSound,
        ownerId: 'player-2',
        ownerName: 'Morgana',
      },
    ]);
  });
});

describe('personalized state settings', () => {
  it('adds server clock sync to outgoing turn timer state without mutating the game', () => {
    const game = new Game('timer-clock-sync', 'player-1');
    game.turnTimerState = {
      playerId: 'player-1',
      playerName: 'Merlin',
      phase: GamePhase.PLAYING,
      startedAt: 1_000,
      durationMs: 5_000,
      expiresAt: 6_000,
      expired: false,
      sequence: 1,
    };

    const state = createPersonalizedState(game, 'player-1', {
      name: 'Timer Clock Sync',
      isPublic: true,
      maxPlayers: 3,
    }, 1_234);

    expect(state.turnTimerState?.serverNow).toBe(1_234);
    expect(game.turnTimerState?.serverNow).toBeUndefined();
  });

  it('reveals all bids after every player has bid in hidden-bids mode', () => {
    const game = new Game('hidden-bids-complete', 'player-1');
    game.setRulesetConfig({
      ...DEFAULT_RULESET_CONFIG,
      bidding: {
        ...DEFAULT_RULESET_CONFIG.bidding,
        hiddenBids: true,
      },
    });
    game.phase = GamePhase.PLAYING;
    game.currentRound = 1;
    game.players = [
      new Player('player-1', 'Merlin'),
      new Player('player-2', 'Morgana'),
      new Player('player-3', 'Galahad'),
    ];
    game.players[0].receiveCards([new Card('p1-card', CardType.NUMBER, Suit.GIANTS, 1)]);
    game.players[1].receiveCards([new Card('p2-card', CardType.NUMBER, Suit.ELVES, 1)]);
    game.players[2].receiveCards([new Card('p3-card', CardType.NUMBER, Suit.DWARVES, 1)]);
    game.players[0].placeBid(1);
    game.players[1].placeBid(0);
    game.players[2].placeBid(0);

    const state = createPersonalizedState(game, 'player-2', {
      name: 'Hidden Bids',
      isPublic: true,
      maxPlayers: 3,
      rulesetConfig: game.rulesetConfig,
    });

    expect(state.players.map((player) => player.bid)).toEqual([1, 0, 0]);
  });
});
