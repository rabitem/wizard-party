import type { IGameState } from '@shared/domain';
import { isAwaitingSeat, type ConnectionStatus } from '@/presentation/types';

export interface ResultsRedirectInput {
  sessionLoaded: boolean;
  /** The player chose to leave: the provider navigates then, nothing may race it. */
  isLeaving: boolean;
  status: ConnectionStatus;
  hasError: boolean;
  gameState: IGameState | null;
  playerId: string | null;
  isCorrectRoom: boolean;
}

/**
 * Where the results page sends the player, or null to stay. A dropped connection keeps the results
 * on screen (the client reconnects; a rematch follows the phase); only a client without a seat, or
 * one seated in another room, goes home. Phase changes are routed by the provider.
 */
export function resolveResultsRedirect({
  sessionLoaded, isLeaving, status, hasError, gameState, playerId, isCorrectRoom,
}: ResultsRedirectInput): string | null {
  if (!sessionLoaded || isLeaving) return null;
  if (!gameState || !playerId) return isAwaitingSeat(status, hasError) ? null : '/';
  return isCorrectRoom ? null : '/';
}
