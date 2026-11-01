import { describe, expect, it } from 'vitest';

import {
  buildSoundPreferencesFromSettings,
  buildTrickResultAudioKey,
  resolveTimeoutSoundVolume,
  resolveCardLandingSound,
  resolveTrickResultAudio,
  shouldForceTimeoutSoundVolume,
  shouldPlayTrickResultAudio,
  shouldPlayBidSound,
  shouldPlayTimeoutSound,
} from './useGameClientEffects';
import { GamePhase, type IGameState } from '@shared/domain';
import type { GameSettings } from '@/presentation/components/settings';

const baseSettings: GameSettings = {
  avatar: 'wizard1',
  cardTheme: 'fantasy',
  tableTheme: 'default',
  notificationsEnabled: true,
  cardNumberSize: 'medium',
  wizardSound: 'random',
  jesterSound: 'random',
  trickWinSound: 'random',
  collectionAnimation: 'random',
  theme: 'dark',
  customTrickWinAudio: null,
  customSounds: [],
  leaderboardPosition: 'right',
  leaderboardCompact: false,
  tableCharacters: true,
};

describe('game sound effect helpers', () => {
  it('dedupes trick-result audio across duplicate activation', () => {
    const trickResult = {
      winnerId: 'player-2',
      winnerName: 'Morgana',
      timestamp: 100,
      soundChoice: 'trickWinChoir',
    };
    const key = buildTrickResultAudioKey(trickResult);

    expect(shouldPlayTrickResultAudio({
      trickResult,
      lastPlayedTrickResultKey: null,
    })).toBe(true);

    expect(shouldPlayTrickResultAudio({
      trickResult: { ...trickResult },
      lastPlayedTrickResultKey: key,
    })).toBe(false);

    expect(shouldPlayTrickResultAudio({
      trickResult: { ...trickResult, timestamp: 101 },
      lastPlayedTrickResultKey: key,
    })).toBe(true);
  });

  it('only plays bid sounds for new bid events from other players', () => {
    expect(shouldPlayBidSound({
      latestBid: { id: 'bid-1', playerId: 'player-2', bid: 1, timestamp: 1 },
      playerId: 'player-1',
      lastPlayedBidEventId: null,
    })).toBe(true);

    expect(shouldPlayBidSound({
      latestBid: { id: 'bid-1', playerId: 'player-2', bid: 1, timestamp: 1 },
      playerId: 'player-1',
      lastPlayedBidEventId: 'bid-1',
    })).toBe(false);

    expect(shouldPlayBidSound({
      latestBid: { id: 'bid-2', playerId: 'player-1', bid: 2, timestamp: 2 },
      playerId: 'player-1',
      lastPlayedBidEventId: null,
    })).toBe(false);

    expect(shouldPlayBidSound({
      latestBid: { id: 'bid-3', playerId: 'player-2', bid: 1, timestamp: 3 },
      playerId: null,
      lastPlayedBidEventId: null,
    })).toBe(false);
  });

  it('only plays timeout sounds once per targeted event', () => {
    const latestEvent = {
      id: 'timeout-sound-1',
      targetPlayerId: 'player-1',
      targetPlayerName: 'Merlin',
      senderPlayerId: 'player-2',
      senderPlayerName: 'Morgana',
      soundName: 'jesterBonk',
      timestamp: 1,
    };

    expect(shouldPlayTimeoutSound({
      latestEvent,
      lastPlayedEventId: null,
    })).toBe(true);

    expect(shouldPlayTimeoutSound({
      latestEvent,
      lastPlayedEventId: 'timeout-sound-1',
    })).toBe(false);

    expect(shouldPlayTimeoutSound({
      latestEvent: undefined,
      lastPlayedEventId: null,
    })).toBe(false);

    expect(shouldPlayTimeoutSound({
      latestEvent: { ...latestEvent, id: 'timeout-sound-2', soundName: 'missing-sound-file' },
      lastPlayedEventId: null,
    })).toBe(false);
  });

  it('allows custom audio timeout events through the timeout sound guard', () => {
    expect(shouldPlayTimeoutSound({
      latestEvent: {
        id: 'timeout-custom-1',
        targetPlayerId: 'player-1',
        targetPlayerName: 'Merlin',
        senderPlayerId: 'player-2',
        senderPlayerName: 'Morgana',
        customAudio: {
          id: 'custom-afk',
          name: 'custom-afk.wav',
          dataUrl: 'data:audio/wav;base64,AAAA',
          size: 128,
          duration: 1,
          category: 'custom',
          roles: { wizard: false, jester: false, trick: false, afk: true, shared: false },
        },
        timestamp: 1,
      },
      lastPlayedEventId: null,
    })).toBe(true);
  });

  it('resolves timeout sound volume from synchronized room rules', () => {
    expect(resolveTimeoutSoundVolume(null)).toBe(1);
    expect(resolveTimeoutSoundVolume({
      id: 'room-1',
      phase: GamePhase.PLAYING,
      rulesetConfig: {
        turn: {
          biddingTimerSeconds: 8,
          playTimerSeconds: 5,
          timeoutSoundVolume: 0.45,
        },
      },
    } as IGameState)).toBe(0.45);
    expect(resolveTimeoutSoundVolume({
      id: 'room-1',
      phase: GamePhase.PLAYING,
      rulesetConfig: {
        turn: {
          biddingTimerSeconds: 8,
          playTimerSeconds: 5,
          timeoutSoundVolume: 2,
        },
      },
    } as unknown as IGameState)).toBe(1);
  });

  it('forces timeout sound volume only for the timed-out target', () => {
    const latestEvent = {
      id: 'timeout-sound-1',
      targetPlayerId: 'player-1',
      targetPlayerName: 'Merlin',
      senderPlayerId: 'player-2',
      senderPlayerName: 'Morgana',
      soundName: 'jesterAirhorn',
      timestamp: 1,
    };

    expect(shouldForceTimeoutSoundVolume({
      playerId: 'player-1',
      latestEvent,
    })).toBe(true);
    expect(shouldForceTimeoutSoundVolume({
      playerId: 'player-2',
      latestEvent,
    })).toBe(false);
  });

  it('falls back to the impact sound for invalid or wrong-category landing sounds', () => {
    expect(resolveCardLandingSound(null)).toBe('cardImpact');
    expect(resolveCardLandingSound('missing-sound-file')).toBe('cardImpact');
    expect(resolveCardLandingSound('trickWinAirhorn')).toBe('cardImpact');
    expect(resolveCardLandingSound('wizardAirhorn')).toBe('wizardAirhorn');
    expect(resolveCardLandingSound('jesterSadTrombone')).toBe('jesterSadTrombone');
  });

  it("plays the winner's uploaded trick audio from the event, and the local upload only for a local win", () => {
    const upload = (id: string, dataUrl: string) => ({
      id,
      name: `${id}.wav`,
      dataUrl,
      size: 128,
      duration: 1,
      category: 'custom' as const,
      roles: { wizard: false, jester: false, trick: true, afk: false, shared: false },
    });
    const local = upload('local', 'data:audio/wav;base64,LOCAL');
    const remote = upload('remote', 'data:audio/wav;base64,REMOTE');
    const settings: GameSettings = { ...baseSettings, customTrickWinAudio: local, customSounds: [local] };
    const audioFor = (winnerId: string, customTrickWinAudio: typeof remote | null) => resolveTrickResultAudio({
      trickResult: { winnerId, winnerName: 'Winner', timestamp: 1, soundChoice: 'trickWinChoir', customTrickWinAudio },
      playerId: 'player-1',
      settings,
      fallbackSound: 'trickWinFanfare',
    });

    expect(audioFor('player-2', remote)).toEqual({ type: 'custom', dataUrl: remote.dataUrl });
    // Another seat's win without an upload plays its preset, never the local upload.
    expect(audioFor('player-2', null)).toEqual({ type: 'sound', sound: 'trickWinChoir' });
    expect(audioFor('player-1', null)).toEqual({ type: 'custom', dataUrl: local.dataUrl });
  });

  it('builds server sound preferences with custom audio upload state', () => {
    const customTrickWinAudio = {
      id: 'custom-1',
      name: 'win.wav',
      dataUrl: 'data:audio/wav;base64,AAAA',
      size: 128,
      duration: 1,
      category: 'custom' as const,
      roles: { wizard: false, jester: false, trick: true, afk: false, shared: false },
    };
    const sharedCustomSound = {
      id: 'shared-1',
      name: 'shared.wav',
      dataUrl: 'data:audio/wav;base64,BBBB',
      size: 128,
      duration: 1,
      category: 'custom' as const,
      roles: { wizard: false, jester: false, trick: false, afk: false, shared: true },
    };

    expect(buildSoundPreferencesFromSettings({
      ...baseSettings,
      trickWinSound: 'trickWinChoir',
      customTrickWinAudio,
      customSounds: [customTrickWinAudio, sharedCustomSound],
    })).toEqual({
      trickWinSound: 'trickWinChoir',
      customTrickWinAudio,
      customTrickWinAudios: [customTrickWinAudio],
      sharedCustomSounds: [sharedCustomSound],
    });

    expect(buildSoundPreferencesFromSettings({
      ...baseSettings,
      customTrickWinAudio: null,
      customSounds: [],
    })).toEqual({
      trickWinSound: 'random',
      customTrickWinAudio: null,
      customTrickWinAudios: null,
      sharedCustomSounds: null,
    });
  });
});
