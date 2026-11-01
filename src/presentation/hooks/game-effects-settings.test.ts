import { describe, expect, it } from 'vitest';

import {
  shouldPlayEmoteSound,
  selectPhaseTransitionSound,
  selectTrickWinPlayback,
  shouldSendTurnNotification,
  TURN_NOTIFICATION_ICON,
} from './useGameEffects';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GamePhase } from '@shared/domain';

const publicDir = fileURLToPath(new URL('../../../public', import.meta.url));

describe('game effects setting decisions', () => {
  it('references a bundled notification icon file', () => {
    expect(TURN_NOTIFICATION_ICON).toMatch(/^\/.+/);
    expect(existsSync(`${publicDir}${TURN_NOTIFICATION_ICON}`)).toBe(true);
  });

  it('only plays the emote sound when a new emote appears', () => {
    expect(shouldPlayEmoteSound([], null)).toBe(false);
    expect(shouldPlayEmoteSound([{ id: 'emote-1' }], null)).toBe(true);
    expect(shouldPlayEmoteSound([{ id: 'emote-1' }], 'emote-1')).toBe(false);
    expect(shouldPlayEmoteSound([{ id: 'emote-1' }, { id: 'emote-2' }], 'emote-1')).toBe(true);
  });

  it.each([
    { notificationsEnabled: false, documentHidden: true, permission: 'granted', sends: false },
    { notificationsEnabled: true, documentHidden: false, permission: 'granted', sends: false },
    { notificationsEnabled: true, documentHidden: true, permission: 'denied', sends: false },
    { notificationsEnabled: true, documentHidden: true, permission: 'granted', sends: true },
  ] as const)(
    'requires the saved setting, a hidden document and granted permission for turn notifications (enabled $notificationsEnabled, hidden $documentHidden, $permission)',
    ({ sends, ...input }) => {
      expect(shouldSendTurnNotification(input)).toBe(sends);
    }
  );

  it('uses custom trick win audio only for the local winning player', () => {
    const customTrickWinAudio = {
      id: 'custom-1',
      name: 'Custom',
      dataUrl: 'data:audio/wav;base64,AAAA',
      size: 128,
      duration: 1,
      category: 'custom' as const,
      roles: { wizard: false, jester: false, trick: true, afk: false, shared: false },
    };

    expect(selectTrickWinPlayback({
      winnerId: 'player-1',
      playerId: 'player-1',
      soundChoice: 'trickWinFanfare',
      customTrickWinAudio,
      fallbackSound: 'trickWinAirhorn',
    })).toEqual({
      type: 'custom-audio',
      dataUrl: customTrickWinAudio.dataUrl,
    });

    expect(selectTrickWinPlayback({
      winnerId: 'player-2',
      playerId: 'player-1',
      soundChoice: 'trickWinFanfare',
      customTrickWinAudio,
      fallbackSound: 'trickWinAirhorn',
    })).toEqual({
      type: 'preset',
      soundName: 'trickWinFanfare',
    });
  });

  it('uses synchronized custom trick win audio for remote winners', () => {
    const eventCustomTrickWinAudio = {
      id: 'custom-remote',
      name: 'Remote Custom',
      dataUrl: 'data:audio/ogg;base64,BBBB',
      size: 256,
      duration: 2,
    };

    expect(selectTrickWinPlayback({
      winnerId: 'player-2',
      playerId: 'player-1',
      soundChoice: 'trickWinFanfare',
      customTrickWinAudio: null,
      eventCustomTrickWinAudio,
      fallbackSound: 'trickWinAirhorn',
    })).toEqual({
      type: 'custom-audio',
      dataUrl: eventCustomTrickWinAudio.dataUrl,
    });
  });

  it.each([
    { soundChoice: undefined, reason: 'no choice' },
    { soundChoice: 'missing-sound-file', reason: 'an unknown sound' },
    { soundChoice: 'wizardAirhorn', reason: 'a wrong-category sound' },
  ])('falls back to the generated trick win sound when the server event carries $reason', ({ soundChoice }) => {
    expect(selectTrickWinPlayback({
      winnerId: 'player-2',
      playerId: 'player-1',
      soundChoice,
      customTrickWinAudio: null,
      fallbackSound: 'trickWinAirhorn',
    })).toEqual({
      type: 'preset',
      soundName: 'trickWinAirhorn',
    });
  });

  it('uses bundled round and game winner audio pools instead of the unused generic tones for winners', () => {
    expect(selectPhaseTransitionSound({
      currentPhase: GamePhase.ROUND_END,
      previousPhase: GamePhase.PLAYING,
      isRoundWinner: true,
      isGameWinner: false,
      roundWinSound: 'roundWinCheer',
      gameWinSound: 'gameWinChampion',
    })).toBe('roundWinCheer');

    expect(selectPhaseTransitionSound({
      currentPhase: GamePhase.GAME_END,
      previousPhase: GamePhase.ROUND_END,
      isRoundWinner: false,
      isGameWinner: true,
      roundWinSound: 'roundWinCheer',
      gameWinSound: 'gameWinChampion',
    })).toBe('gameWinChampion');
  });

  it('keeps neutral and losing phase sounds for non-winning players', () => {
    expect(selectPhaseTransitionSound({
      currentPhase: GamePhase.ROUND_END,
      previousPhase: GamePhase.PLAYING,
      isRoundWinner: false,
      isGameWinner: false,
      roundWinSound: 'roundWinCheer',
      gameWinSound: 'gameWinChampion',
    })).toBe('roundEnd');

    expect(selectPhaseTransitionSound({
      currentPhase: GamePhase.GAME_END,
      previousPhase: GamePhase.ROUND_END,
      isRoundWinner: false,
      isGameWinner: false,
      roundWinSound: 'roundWinCheer',
      gameWinSound: 'gameWinChampion',
    })).toBe('gameLose');
  });
});
