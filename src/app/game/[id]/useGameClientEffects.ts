'use client';

import { useEffect, useRef } from 'react';
import { ensureRulesetConfig, type IGameState, type SoundPreferences } from '@shared/domain';
import {
  useSound,
  getRandomTrickWinSound,
  isCardLandingSoundName,
  isSoundName,
  type SoundName,
} from '@/lib/sounds';
import { getCustomSoundsForRole, loadGameSettings, type GameSettings } from '@/presentation/components/settings';
import { selectTrickWinPlayback, useGameEffects, useKeyboardShortcuts } from '@/presentation/hooks/useGameEffects';
import type { BidEvent, TimeoutSoundEvent, TrickResult } from '@/presentation/types';

export { useGameRedirect } from './useGameRedirect';

type GameState = IGameState;

export type TrickResultAudio =
  | { type: 'sound'; sound: SoundName }
  | { type: 'custom'; dataUrl: string };

export function shouldPlayBidSound({
  latestBid,
  playerId,
  lastPlayedBidEventId,
}: {
  latestBid: BidEvent | undefined;
  playerId: string | null;
  lastPlayedBidEventId: string | null;
}): boolean {
  if (!latestBid || !playerId || latestBid.id === lastPlayedBidEventId) return false;
  return latestBid.playerId !== playerId;
}

export function shouldPlayTimeoutSound({
  latestEvent,
  lastPlayedEventId,
}: {
  latestEvent: TimeoutSoundEvent | undefined;
  lastPlayedEventId: string | null;
}): boolean {
  return Boolean(
    latestEvent &&
    latestEvent.id !== lastPlayedEventId &&
    (latestEvent.customAudio || isSoundName(latestEvent.soundName))
  );
}

export function resolveTimeoutSoundVolume(gameState: GameState | null): number {
  return ensureRulesetConfig(gameState?.rulesetConfig).turn.timeoutSoundVolume;
}

export function shouldForceTimeoutSoundVolume({
  playerId,
  latestEvent,
}: {
  playerId: string | null;
  latestEvent: TimeoutSoundEvent;
}): boolean {
  return latestEvent.targetPlayerId === playerId;
}

export function resolveCardLandingSound(soundChoice: string | null | undefined): SoundName {
  return isCardLandingSoundName(soundChoice) ? soundChoice : 'cardImpact';
}

/** What a trick result plays: the local settings and the winner's event audio, by selectTrickWinPlayback. */
export function resolveTrickResultAudio({
  trickResult,
  playerId,
  settings,
  fallbackSound,
}: {
  trickResult: TrickResult;
  playerId: string | null;
  settings: GameSettings;
  fallbackSound: SoundName;
}): TrickResultAudio {
  const playback = selectTrickWinPlayback({
    winnerId: trickResult.winnerId,
    playerId,
    soundChoice: trickResult.soundChoice,
    customTrickWinAudio: settings.customTrickWinAudio,
    eventCustomTrickWinAudio: trickResult.customTrickWinAudio,
    fallbackSound,
  });

  if (playback.type === 'custom-audio') {
    return { type: 'custom', dataUrl: playback.dataUrl };
  }

  return {
    type: 'sound',
    sound: isSoundName(playback.soundName) ? playback.soundName : fallbackSound,
  };
}

interface UseGameSoundEffectsProps {
  gameState: GameState | null;
  playerId: string | null;
  emotes: Array<{ id: string; playerId: string; emoteId: string; playerName: string }>;
  bidEvents: BidEvent[];
  timeoutSoundEvents: TimeoutSoundEvent[];
  trickResult: TrickResult | null;
  isTrickAnimationPending: boolean;
  isConnected: boolean;
  updateSoundPreferences: (prefs: SoundPreferences) => void;
}

const MAX_PLAYED_TRICK_RESULT_AUDIO_KEYS = 50;
const playedTrickResultAudioKeys = new Set<string>();

export function buildTrickResultAudioKey(trickResult: TrickResult): string {
  return [
    trickResult.timestamp,
    trickResult.winnerId,
    trickResult.soundChoice ?? 'default',
    trickResult.customTrickWinAudio?.id ?? 'no-custom',
  ].join(':');
}

export function buildSoundPreferencesFromSettings(settings: Pick<GameSettings, 'trickWinSound' | 'customTrickWinAudio' | 'customSounds'>): SoundPreferences {
  const customTrickWinAudios = getCustomSoundsForRole(settings, 'trick');
  const sharedCustomSounds = getCustomSoundsForRole(settings, 'shared');
  return {
    trickWinSound: settings.trickWinSound,
    customTrickWinAudio: settings.customTrickWinAudio,
    customTrickWinAudios: customTrickWinAudios.length > 0 ? customTrickWinAudios : null,
    sharedCustomSounds: sharedCustomSounds.length > 0 ? sharedCustomSounds : null,
  };
}

export function shouldPlayTrickResultAudio({
  trickResult,
  lastPlayedTrickResultKey,
}: {
  trickResult: TrickResult | null;
  lastPlayedTrickResultKey: string | null;
}): boolean {
  if (!trickResult) return false;

  const key = buildTrickResultAudioKey(trickResult);
  return key !== lastPlayedTrickResultKey && !playedTrickResultAudioKeys.has(key);
}

function rememberPlayedTrickResultAudioKey(key: string): void {
  if (playedTrickResultAudioKeys.has(key)) return;

  playedTrickResultAudioKeys.add(key);
  if (playedTrickResultAudioKeys.size <= MAX_PLAYED_TRICK_RESULT_AUDIO_KEYS) return;

  const oldestKey = playedTrickResultAudioKeys.values().next().value;
  if (oldestKey) playedTrickResultAudioKeys.delete(oldestKey);
}

export function useGameSoundEffects({
  gameState,
  playerId,
  emotes,
  bidEvents,
  timeoutSoundEvents,
  trickResult,
  isTrickAnimationPending,
  isConnected,
  updateSoundPreferences,
}: UseGameSoundEffectsProps) {
  const sound = useSound();
  const lastPlayedBidEventIdRef = useRef<string | null>(null);
  const lastPlayedTimeoutSoundIdRef = useRef<string | null>(null);
  const lastPlayedTrickResultKeyRef = useRef<string | null>(null);
  const timeoutSoundVolume = resolveTimeoutSoundVolume(gameState);

  // Game effects (sounds, notifications, stats)
  useGameEffects({
    gameState,
    playerId,
    emotes,
    playSound: sound.play,
    delayEndPhaseSounds: isTrickAnimationPending,
  });

  // Play bid sound when other players place their bids
  useEffect(() => {
    const latestBid = bidEvents[bidEvents.length - 1];
    if (shouldPlayBidSound({
      latestBid,
      playerId,
      lastPlayedBidEventId: lastPlayedBidEventIdRef.current,
    })) {
      sound.play('bidPlace');
    }
    if (latestBid) {
      lastPlayedBidEventIdRef.current = latestBid.id;
    }
  }, [bidEvents, playerId, sound]);

  useEffect(() => {
    const latestEvent = timeoutSoundEvents[timeoutSoundEvents.length - 1];
    if (!shouldPlayTimeoutSound({
      latestEvent,
      lastPlayedEventId: lastPlayedTimeoutSoundIdRef.current,
    })) return;

    if (!latestEvent) return;

    lastPlayedTimeoutSoundIdRef.current = latestEvent.id;
    const forceVolume = shouldForceTimeoutSoundVolume({ playerId, latestEvent });
    if (latestEvent.customAudio) {
      if (forceVolume) sound.playCustomAudioAtVolume(latestEvent.customAudio.dataUrl, timeoutSoundVolume);
      else sound.playCustomAudio(latestEvent.customAudio.dataUrl);
      return;
    }
    if (isSoundName(latestEvent.soundName)) {
      if (forceVolume) sound.playAtVolume(latestEvent.soundName, timeoutSoundVolume);
      else sound.play(latestEvent.soundName);
    }
  }, [playerId, timeoutSoundEvents, sound, timeoutSoundVolume]);

  // Play trick win sound when trick result is activated
  useEffect(() => {
    if (!shouldPlayTrickResultAudio({
      trickResult,
      lastPlayedTrickResultKey: lastPlayedTrickResultKeyRef.current,
    })) return;

    if (!trickResult) return;

    const key = buildTrickResultAudioKey(trickResult);
    lastPlayedTrickResultKeyRef.current = key;
    rememberPlayedTrickResultAudioKey(key);

    const audio = resolveTrickResultAudio({
      trickResult,
      playerId,
      settings: loadGameSettings(),
      fallbackSound: getRandomTrickWinSound(),
    });
    if (audio.type === 'custom') sound.playCustomAudio(audio.dataUrl);
    else sound.play(audio.sound);
  }, [trickResult, playerId, sound]);

  // Send sound preferences to server on connect
  useEffect(() => {
    if (isConnected) {
      const settings = loadGameSettings();
      updateSoundPreferences(buildSoundPreferencesFromSettings(settings));
    }
  }, [isConnected, updateSoundPreferences]);

  // Listen for settings changes and update server
  useEffect(() => {
    if (!isConnected) return;

    const handleSettingsChange = (event: CustomEvent<GameSettings>) => {
      updateSoundPreferences(buildSoundPreferencesFromSettings(event.detail));
    };

    window.addEventListener('settings-changed', handleSettingsChange as EventListener);
    return () => {
      window.removeEventListener('settings-changed', handleSettingsChange as EventListener);
    };
  }, [isConnected, updateSoundPreferences]);

  return sound;
}

interface UseGameKeyboardShortcutsProps {
  gameState: GameState | null;
  playerId: string | null;
  selectedCardId: string | null;
  setSelectedCardId: React.Dispatch<React.SetStateAction<string | null>>;
  setSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  getPlayableCards: () => Array<{ id: string }>;
}

export function useGameKeyboardShortcutsWrapper(props: UseGameKeyboardShortcutsProps) {
  useKeyboardShortcuts(props);
}
