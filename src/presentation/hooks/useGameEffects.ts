'use client';

import { useEffect, useRef } from 'react';
import { GamePhase, IGameState, getDisplayPhase, getStandings, getWinnerIds, type CustomTrickWinAudio } from '@shared/domain';
import { newClientGameId, recordFinishedGame } from '@/lib/account/game-result-sink';
import { isSandboxRoute } from '@/presentation/utils/sandbox-route';
import {
  getRandomGameWinSound,
  getRandomRoundWinSound,
  isTrickWinSoundName,
  type SoundName,
} from '@/lib/sounds';
import { loadGameSettings, type CustomAudioSettings } from '@/presentation/components/settings';

type SoundType = SoundName;

export const TURN_NOTIFICATION_ICON = '/favicon.png';

interface TurnNotificationInput {
  notificationsEnabled: boolean;
  documentHidden: boolean;
  permission: NotificationPermission;
}

interface TrickWinPlaybackInput {
  winnerId: string;
  playerId: string | null;
  soundChoice: string | undefined;
  customTrickWinAudio: CustomAudioSettings | null;
  eventCustomTrickWinAudio?: CustomTrickWinAudio | null;
  fallbackSound: string;
}

interface PhaseTransitionSoundInput {
  currentPhase: GamePhase;
  previousPhase: GamePhase | undefined;
  isRoundWinner: boolean;
  isGameWinner: boolean;
  roundWinSound: SoundType;
  gameWinSound: SoundType;
}

export type TrickWinPlayback =
  | { type: 'custom-audio'; dataUrl: string }
  | { type: 'preset'; soundName: string };

export function shouldSendTurnNotification({
  notificationsEnabled,
  documentHidden,
  permission,
}: TurnNotificationInput): boolean {
  return notificationsEnabled && documentHidden && permission === 'granted';
}

export function shouldPlayEmoteSound(
  emotes: { id: string }[],
  lastPlayedEmoteId: string | null
): boolean {
  const latestEmote = emotes[emotes.length - 1];
  return Boolean(latestEmote && latestEmote.id !== lastPlayedEmoteId);
}

export function selectTrickWinPlayback({
  winnerId,
  playerId,
  soundChoice,
  customTrickWinAudio,
  eventCustomTrickWinAudio,
  fallbackSound,
}: TrickWinPlaybackInput): TrickWinPlayback {
  if (eventCustomTrickWinAudio) {
    return { type: 'custom-audio', dataUrl: eventCustomTrickWinAudio.dataUrl };
  }

  if (playerId === winnerId && customTrickWinAudio) {
    return { type: 'custom-audio', dataUrl: customTrickWinAudio.dataUrl };
  }

  return {
    type: 'preset',
    soundName: isTrickWinSoundName(soundChoice) ? soundChoice : fallbackSound,
  };
}

/**
 * Determines which sound to play based on phase transition
 */
export function selectPhaseTransitionSound({
  currentPhase,
  previousPhase,
  isRoundWinner,
  isGameWinner,
  roundWinSound,
  gameWinSound,
}: PhaseTransitionSoundInput): SoundType | null {
  // Round end sound
  if (currentPhase === GamePhase.ROUND_END && previousPhase === GamePhase.PLAYING) {
    return isRoundWinner ? roundWinSound : 'roundEnd';
  }

  // Game end sound
  if (currentPhase === GamePhase.GAME_END && previousPhase !== GamePhase.GAME_END) {
    return isGameWinner ? gameWinSound : 'gameLose';
  }

  // Card deal sound
  if (currentPhase === GamePhase.BIDDING && previousPhase !== GamePhase.BIDDING) {
    return 'cardDeal';
  }

  return null;
}

function getLastRoundScore(player: IGameState['players'][number]): number | null {
  const lastRound = player.roundHistory?.[player.roundHistory.length - 1];
  return typeof lastRound?.score === 'number' && Number.isFinite(lastRound.score)
    ? lastRound.score
    : null;
}

function isLocalRoundWinner(gameState: IGameState | null, playerId: string | null): boolean {
  if (!gameState || !playerId) return false;

  let localScore: number | null = null;
  let bestScore: number | null = null;

  for (const player of gameState.players) {
    const score = getLastRoundScore(player);
    if (score === null) continue;
    if (player.id === playerId) localScore = score;
    bestScore = bestScore === null ? score : Math.max(bestScore, score);
  }

  return localScore !== null && bestScore !== null && localScore === bestScore;
}

function isLocalGameWinner(gameState: IGameState | null, playerId: string | null): boolean {
  if (!gameState || !playerId) return false;
  // Co-winners (tied best score) all win.
  return getWinnerIds(gameState.players).includes(playerId);
}

interface UseGameEffectsProps {
  gameState: IGameState | null;
  playerId: string | null;
  emotes: { id: string }[];
  playSound: (sound: SoundType) => void;
  delayEndPhaseSounds?: boolean;
}

export function useGameEffects({
  gameState,
  playerId,
  emotes,
  playSound,
  delayEndPhaseSounds = false,
}: UseGameEffectsProps) {
  const prevCurrentPlayerRef = useRef<number | null>(null);
  const statsRecordedRef = useRef(false);
  const prevPhaseForStatsRef = useRef<GamePhase | undefined>(undefined);
  const prevPhaseForSoundRef = useRef<GamePhase | undefined>(undefined);
  const lastPlayedEmoteIdRef = useRef<string | null>(null);

  // Play sound for emotes
  useEffect(() => {
    if (shouldPlayEmoteSound(emotes, lastPlayedEmoteIdRef.current)) {
      playSound('emote');
    }
    const latestEmote = emotes[emotes.length - 1];
    if (latestEmote) {
      lastPlayedEmoteIdRef.current = latestEmote.id;
    }
  }, [emotes, playSound]);

  // Browser notifications for turn
  useEffect(() => {
    if (!gameState || !playerId || gameState.phase !== GamePhase.PLAYING) return;

    const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === playerId;
    const wasNotMyTurn = prevCurrentPlayerRef.current !== null &&
      prevCurrentPlayerRef.current !== gameState.currentPlayerIndex;

    if (isMyTurn && wasNotMyTurn && document.hidden) {
      playSound('yourTurn');
      const settings = loadGameSettings();
      if ('Notification' in window && shouldSendTurnNotification({
        notificationsEnabled: settings.notificationsEnabled,
        documentHidden: document.hidden,
        permission: Notification.permission,
      })) {
        new Notification('Wizard Party', {
          body: "It's your turn!",
          icon: TURN_NOTIFICATION_ICON,
          tag: 'turn-notification',
        });
      }
    }

    prevCurrentPlayerRef.current = gameState.currentPlayerIndex;
  }, [gameState, playerId, playSound]);

  // Record stats when game ends and reset flag when back in lobby
  useEffect(() => {
    const currentPhase = gameState?.phase;

    // Reset flag when entering lobby
    if (currentPhase === GamePhase.LOBBY && prevPhaseForStatsRef.current !== GamePhase.LOBBY) {
      statsRecordedRef.current = false;
    }
    prevPhaseForStatsRef.current = currentPhase;

    // Record stats when game ends. Sandbox games are simulated and never count.
    if (!gameState || !playerId || currentPhase !== GamePhase.GAME_END || statsRecordedRef.current || isSandboxRoute()) return;

    const localPlayer = gameState.players.find((p) => p.id === playerId);
    if (!localPlayer) return;

    // Competition ranking: a co-winner is recorded as 1st, like everywhere else.
    const placement = getStandings(gameState.players).find((s) => s.playerId === playerId)?.rank ?? gameState.players.length;

    // Guests keep results in this browser, signed-in players in their account (see game-result-sink).
    recordFinishedGame({
      clientGameId: newClientGameId(),
      playedAt: Date.now(),
      playerCount: gameState.players.length,
      placement,
      score: localPlayer.score,
      rounds: (localPlayer.roundHistory ?? []).map((rh) => ({ bid: rh.bid, tricksWon: rh.tricksWon, roundScore: rh.score })),
    });

    statsRecordedRef.current = true;
  }, [gameState, playerId]);

  // Play sounds for phase transitions
  useEffect(() => {
    // A pause and its resume are not phase changes: no deal sound replays after a reconnect.
    const currentPhase = gameState ? getDisplayPhase(gameState) : undefined;
    if (!currentPhase || !playerId) return;
    if (
      delayEndPhaseSounds &&
      (currentPhase === GamePhase.ROUND_END || currentPhase === GamePhase.GAME_END)
    ) {
      return;
    }

    const sound = selectPhaseTransitionSound({
      currentPhase,
      previousPhase: prevPhaseForSoundRef.current,
      isRoundWinner: isLocalRoundWinner(gameState, playerId),
      isGameWinner: isLocalGameWinner(gameState, playerId),
      roundWinSound: currentPhase === GamePhase.ROUND_END ? getRandomRoundWinSound() : 'roundEnd',
      gameWinSound: currentPhase === GamePhase.GAME_END ? getRandomGameWinSound() : 'gameWin',
    });
    if (sound) {
      playSound(sound);
    }
    prevPhaseForSoundRef.current = currentPhase;
  }, [gameState, playerId, playSound, delayEndPhaseSounds]);

}

interface UseKeyboardShortcutsProps {
  gameState: IGameState | null;
  playerId: string | null;
  selectedCardId: string | null;
  setSelectedCardId: (id: string | null) => void;
  setSettingsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  getPlayableCards: () => { id: string }[];
}

export function useKeyboardShortcuts({
  gameState,
  playerId,
  selectedCardId,
  setSelectedCardId,
  setSettingsOpen,
  getPlayableCards,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Escape') {
        setSettingsOpen((prev) => !prev);
        return;
      }

      if (!gameState || !playerId || gameState.phase !== GamePhase.PLAYING) return;

      const localPlayer = gameState.players.find((p) => p.id === playerId);
      if (!localPlayer) return;

      const isCurrentPlayer = gameState.players[gameState.currentPlayerIndex]?.id === playerId;

      if (e.key >= '1' && e.key <= '9' && isCurrentPlayer) {
        const index = parseInt(e.key) - 1;
        const playable = getPlayableCards();
        if (index < playable.length) {
          const cardToSelect = playable[index];
          // Toggle selection
          if (selectedCardId === cardToSelect.id) {
            setSelectedCardId(null);
          } else {
            setSelectedCardId(cardToSelect.id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, playerId, selectedCardId, setSelectedCardId, setSettingsOpen, getPlayableCards]);
}
