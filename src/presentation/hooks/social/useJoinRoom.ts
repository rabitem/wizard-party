'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { GamePhase } from '@shared/domain';

import { useGame } from '@/presentation/providers/GameProvider';

/** Phases in which leaving would abandon a running game. */
const SETTLED_PHASES: ReadonlySet<GamePhase> = new Set([GamePhase.LOBBY, GamePhase.GAME_END]);

/**
 * Moves the player to another room (accepted invite, "join friend"). The game connection is
 * room-bound, so the current room is left properly first; otherwise the lobby page would bounce
 * straight back to the old room. `needsConfirmation` is true while a game is running, so callers
 * can ask before abandoning it.
 */
export function useJoinRoom() {
  const router = useRouter();
  const { isConnected, gameState, leaveGame } = useGame();
  const currentRoom = isConnected ? gameState?.id ?? null : null;
  const needsConfirmation = currentRoom !== null && gameState !== null && !SETTLED_PHASES.has(gameState.phase);

  const joinRoom = useCallback(
    async (roomCode: string) => {
      if (currentRoom === roomCode) return;
      if (currentRoom) await leaveGame();
      router.push(`/lobby/${encodeURIComponent(roomCode)}`);
    },
    [currentRoom, leaveGame, router]
  );

  /** Leaves the current room before moving somewhere that seats the player elsewhere (a tournament table). */
  const leaveRoom = useCallback(async () => {
    if (currentRoom) await leaveGame();
  }, [currentRoom, leaveGame]);

  return { joinRoom, leaveRoom, needsConfirmation, currentRoom };
}
