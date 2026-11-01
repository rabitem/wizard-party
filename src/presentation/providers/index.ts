/**
 * Game Provider Module
 * Exports for the GameProvider context and related utilities
 */

export { GameProvider, useGame, useGameSessionActions } from './GameProvider';
export {
  useConnectionView,
  useGameClient,
  useGameSnapshot,
  useTableFeed,
  useTrickPresentation,
  type ConnectionView,
  type GameSnapshotView,
  type TrickPresentationState,
} from './game-client-context';
export type { GameContextValue, GameSessionActions } from './game-provider.types';
export { getRouteForPhase, isGameRoute } from './game-provider.utils';
export { useGameNavigation } from './useGameNavigation';
