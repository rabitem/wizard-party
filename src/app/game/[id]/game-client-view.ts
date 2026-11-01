import { GamePhase, type IGameState } from '@shared/domain';

interface LoadingOverlayInput {
  gameState: IGameState | null;
  playerId: string | null;
  isCorrectRoom: boolean;
  isGamePhase: boolean;
}

/**
 * The full-screen loading overlay replaces the whole game view, 3D table included, so it is
 * only for when there is no game to show yet. A dropped connection keeps the last game state
 * and must not unmount the table mid-animation; it gets a non-blocking notice instead.
 */
export function shouldShowLoadingOverlay({ gameState, playerId, isCorrectRoom, isGamePhase }: LoadingOverlayInput): boolean {
  return !gameState || !playerId || !isCorrectRoom || !isGamePhase;
}

interface DerivedStateInput {
  phase: GamePhase;
  isConnected: boolean;
  isTrickAnimating: boolean;
  hasTrickResult: boolean;
  hasPendingTrickResult: boolean;
}

/** Calculate derived game view state */
export function calcDerivedState({ phase, isConnected, isTrickAnimating, hasTrickResult, hasPendingTrickResult }: DerivedStateInput) {
  const showRoundEndUI = phase === GamePhase.ROUND_END && !isTrickAnimating && !hasTrickResult && !hasPendingTrickResult;
  const interactionsDisabled =
    !isConnected ||
    (phase !== GamePhase.PLAYING && phase !== GamePhase.BIDDING) ||
    isTrickAnimating ||
    hasTrickResult;
  return { showRoundEndUI, interactionsDisabled };
}
