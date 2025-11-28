'use client';

import { useEffect, useRef } from 'react';
import { GamePhase, IGameState } from '@shared/domain';
import { loadPlayerStats, recordGameResult, type RoundRecord } from '@/lib/player-stats';
import { reportGameStats } from '@/lib/global-stats';

interface UseGameEffectsProps {
  gameState: IGameState | null;
  playerId: string | null;
  emotes: { id: string }[];
  playSound: (sound: 'emote' | 'yourTurn') => void;
}

export function useGameEffects({
  gameState,
  playerId,
  emotes,
  playSound,
}: UseGameEffectsProps) {
  const prevCurrentPlayerRef = useRef<number | null>(null);
  const statsRecordedRef = useRef(false);
  const prevPhaseRef = useRef<GamePhase | undefined>(undefined);

  // Play sound for emotes
  useEffect(() => {
    if (emotes.length > 0) {
      playSound('emote');
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
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Wizard Party', {
          body: "It's your turn!",
          icon: '/favicon.ico',
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
    if (currentPhase === GamePhase.LOBBY && prevPhaseRef.current !== GamePhase.LOBBY) {
      statsRecordedRef.current = false;
    }
    prevPhaseRef.current = currentPhase;

    // Record stats when game ends
    if (!gameState || !playerId || currentPhase !== GamePhase.GAME_END || statsRecordedRef.current) return;

    const localPlayer = gameState.players.find((p) => p.id === playerId);
    if (!localPlayer) return;

    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
    const placement = sortedPlayers.findIndex((p) => p.id === playerId) + 1;

    const rounds: RoundRecord[] = localPlayer.roundHistory?.map((rh, idx) => ({
      roundNumber: idx + 1,
      cardsInHand: idx + 1,
      bid: rh.bid,
      tricksWon: rh.tricksWon,
      roundScore: rh.score,
    })) || [];

    const currentStats = loadPlayerStats();
    recordGameResult(currentStats, placement, localPlayer.score, gameState.players.length, rounds);

    // Report global stats (only once per game, use host to avoid duplicates)
    if (playerId === gameState.hostId) {
      reportGameStats(gameState);
    }

    statsRecordedRef.current = true;
  }, [gameState, playerId]);
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
