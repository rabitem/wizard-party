'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useGameConnection } from '../hooks/useGameConnection';
import { useSession } from '../hooks/useSession';
import { useStoreSelector } from '../state/external-store';
import type { GameClientState } from '../hooks/connection/game-client-state';
import type { GameSocketFactory } from '../hooks/connection/game-socket';
import { useGameNavigation } from './useGameNavigation';
import { TournamentTableProvider } from './TournamentTableProvider';
import {
  GameClientContext,
  TableFeedContext,
  useConnectionView,
  useGameClient,
  useGameSnapshot,
  useTableFeed,
  useTrickPresentation,
} from './game-client-context';
import type { GameContextValue, GameSessionActions } from './game-provider.types';

const GameSessionContext = createContext<GameSessionActions | null>(null);

export function useGameSessionActions(): GameSessionActions {
  const actions = useContext(GameSessionContext);
  if (!actions) throw new Error('useGameSessionActions must be used within a GameProvider');
  return actions;
}

/**
 * Everything of the game client in one object, for screens that use most of it. It re-renders on
 * any change of the parts it composes; components that need one part use the focused hooks
 * (useConnectionView, useGameSnapshot, useTrickPresentation, useTableFeed, useGameClient).
 */
export function useGame(): GameContextValue {
  const { commands, connection } = useGameClient();
  const sessionActions = useGameSessionActions();
  const { status, isConnected, error } = useConnectionView();
  const snapshot = useGameSnapshot();
  const feed = useTableFeed();
  const trick = useTrickPresentation();

  return useMemo<GameContextValue>(() => ({
    ...commands,
    ...sessionActions,
    connectionStatus: status,
    isConnected,
    error,
    clearError: connection.clearError,
    takeOverSeat: connection.takeOverSeat,
    retryConnection: connection.retryConnection,
    gameState: snapshot.gameState,
    playerId: snapshot.playerId,
    sharedCustomSounds: snapshot.sharedCustomSounds,
    legalCardIds: snapshot.legalCardIds,
    hasPendingPlay: snapshot.hasPendingPlay,
    timeoutSoundEvents: snapshot.timeoutSoundEvents,
    ...feed,
    trickResult: trick.trickResult,
    pendingTrickResult: trick.pendingTrickResult,
    isTrickAnimating: trick.isTrickAnimating,
    trickBacklog: trick.backlog,
    clearTrickResult: trick.clearTrickResult,
    activateTrickResult: trick.activateTrickResult,
    getCardSoundChoice: trick.getCardSoundChoice,
    getCardCustomAudio: trick.getCardCustomAudio,
    getCardPhysicsState: trick.getCardPhysicsState,
    shouldShowPlayedCard: trick.shouldShowPlayedCard,
    shouldAnimatePlayedCard: trick.shouldAnimatePlayedCard,
    handlePlayedCardAnimationComplete: trick.handlePlayedCardAnimationComplete,
  }), [commands, connection, sessionActions, status, isConnected, error, snapshot, feed, trick]);
}

interface GameProviderProps {
  children: ReactNode;
  /** Realtime transport override (the animation sandbox injects an in-browser server). */
  socketFactory?: GameSocketFactory;
  /** When false the provider never persists sessions or changes routes (sandboxed, nested providers). */
  manageNavigation?: boolean;
}

const selectStatus = (state: GameClientState) => state.status;
const selectServerState = (state: GameClientState) => state.serverState;
const selectPlayerId = (state: GameClientState) => state.playerId;

export function GameProvider({ children, socketFactory, manageNavigation = true }: GameProviderProps) {
  const session = useSession();
  const { handles, feed, tournament } = useGameConnection({ socketFactory });
  const status = useStoreSelector(handles.store, selectStatus);
  const serverState = useStoreSelector(handles.store, selectServerState);
  const playerId = useStoreSelector(handles.store, selectPlayerId);

  // Navigation (auto-rejoin, phase-based routing, leaving)
  const { handleConnect, handleLeaveGame, handleDisconnect } = useGameNavigation({
    session,
    connection: handles.connection,
    status,
    gameState: serverState,
    playerId,
    tournament,
    enabled: manageNavigation,
  });

  const { sessionLoaded, clearSession } = session;
  const sessionActions = useMemo<GameSessionActions>(() => ({
    sessionLoaded,
    clearSession,
    connect: handleConnect,
    disconnect: handleDisconnect,
    leaveGame: handleLeaveGame,
  }), [sessionLoaded, clearSession, handleConnect, handleDisconnect, handleLeaveGame]);

  return (
    <GameClientContext.Provider value={handles}>
      <GameSessionContext.Provider value={sessionActions}>
        <TableFeedContext.Provider value={feed}>
          <TournamentTableProvider connection={tournament}>{children}</TournamentTableProvider>
        </TableFeedContext.Provider>
      </GameSessionContext.Provider>
    </GameClientContext.Provider>
  );
}
