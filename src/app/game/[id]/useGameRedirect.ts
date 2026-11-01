'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GamePhase, type IGameState } from '@shared/domain';
import { isAwaitingSeat, type ConnectionStatus } from '@/presentation/types';

type GameState = IGameState;

interface UseGameRedirectProps {
  roomId: string;
  sessionLoaded: boolean;
  /** Where the connection stands; a dropped socket alone never routes away. */
  status: ConnectionStatus;
  /** An error is shown (a refused join answers with one instead of a game state). */
  hasError?: boolean;
  gameState: GameState | null;
  playerId: string | null;
  isCorrectRoom: boolean;
  isTrickAnimationPending?: boolean;
  /** Set once the player confirmed leaving: the provider navigates then (home or the tournament). */
  isLeaving?: boolean;
}

/**
 * Without a game to show: a connection that is still being made (a fresh page load, a reconnect)
 * waits here instead of bouncing through the lobby; anything else goes to the lobby, which offers
 * to join or explains why the seat is gone.
 */
function resolveRedirectWithoutGame({ roomId, status, hasError = false }: Pick<UseGameRedirectProps, 'roomId' | 'status' | 'hasError'>): string | null {
  return isAwaitingSeat(status, hasError) ? null : `/lobby/${roomId}`;
}

export function resolveGameRedirectTarget({
  roomId,
  sessionLoaded,
  status,
  hasError,
  gameState,
  playerId,
  isCorrectRoom,
  isTrickAnimationPending = false,
  isLeaving = false,
}: UseGameRedirectProps): string | null {
  // While leaving, no redirect may race the provider's navigation (it would rejoin the table).
  if (!sessionLoaded || isLeaving) return null;

  // A transient drop keeps the table mounted (it shows that it reconnects); a seat opened in
  // another tab keeps it too, under the take-over prompt.
  if (!gameState || !playerId) return resolveRedirectWithoutGame({ roomId, status, hasError });

  if (!isCorrectRoom) {
    return '/';
  }

  if (gameState.phase === GamePhase.LOBBY) {
    return `/lobby/${roomId}`;
  }

  if (gameState.phase === GamePhase.GAME_END && !isTrickAnimationPending) {
    return `/results/${roomId}`;
  }

  return null;
}

export function useGameRedirect({
  enabled = true,
  roomId,
  sessionLoaded,
  status,
  hasError,
  gameState,
  playerId,
  isCorrectRoom,
  isTrickAnimationPending,
  isLeaving,
}: UseGameRedirectProps & { enabled?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    const target = resolveGameRedirectTarget({
      roomId,
      sessionLoaded,
      status,
      hasError,
      gameState,
      playerId,
      isCorrectRoom,
      isTrickAnimationPending,
      isLeaving,
    });
    if (target) router.replace(target);
  }, [enabled, sessionLoaded, status, hasError, gameState, playerId, isCorrectRoom, isTrickAnimationPending, isLeaving, roomId, router]);
}
