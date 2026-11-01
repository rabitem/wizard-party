/**
 * Game navigation: saves the session, auto-rejoins on a game route, and keeps the route in step
 * with the game phase.
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import type { IGameState } from '@shared/domain';
import { getRouteForPhase, getRouteRoomId, isGameRoute } from './game-provider.utils';
import { TOURNAMENT_ROUTES } from '@/presentation/config/tournament.config';
import type { useSession } from '../hooks/useSession';
import type { ConnectionActions } from '../hooks/useGameConnection';
import type { TournamentTableSource } from './TournamentTableProvider';
import { isTerminalConnectionStatus, type ConnectionStatus, type RoomSettings } from '@/presentation/types';

type Session = ReturnType<typeof useSession>;

interface UseGameNavigationOptions {
  session: Session;
  connection: Pick<ConnectionActions, 'connect' | 'disconnect' | 'leaveGame'>;
  status: ConnectionStatus;
  /** The server's game state (routing follows the real phase, never a presented one). */
  gameState: IGameState | null;
  playerId: string | null;
  tournament: TournamentTableSource;
  /** Disabled navigation connects and leaves without touching the saved session or the route. */
  enabled?: boolean;
}

interface UseGameNavigationReturn {
  handleConnect: (host: string, room: string, name: string, roomSettings?: RoomSettings) => void;
  handleLeaveGame: () => Promise<void>;
  handleDisconnect: () => Promise<void>;
}

/**
 * The route follows the phase while the client holds a seat, also while the connection is being
 * restored: a dropped socket keeps the player where the game is (the table shows that it is
 * reconnecting) instead of sending them through the lobby and back.
 */
export function shouldFollowPhase(status: ConnectionStatus): boolean {
  return status !== 'idle' && !isTerminalConnectionStatus(status);
}

export function useGameNavigation({
  session,
  connection,
  status,
  gameState,
  playerId,
  tournament,
  enabled = true,
}: UseGameNavigationOptions): UseGameNavigationReturn {
  const router = useRouter();
  const pathname = usePathname();
  const { connect, disconnect, leaveGame } = connection;
  // The session object is new every render; its callbacks are stable.
  const { savedSession, saveSession, clearUrlParams, clearSession } = session;

  // Auto-reconnect on mount if a session exists (once), to the room of the page being loaded
  const hasAttemptedReconnect = useRef(false);
  useEffect(() => {
    if (!enabled || hasAttemptedReconnect.current) return;
    if (status !== 'idle') return;
    if (!savedSession) return;
    const room = getRouteRoomId(pathname);
    if (!room) return;

    hasAttemptedReconnect.current = true;
    const { host, name } = savedSession;
    if (room !== savedSession.room) saveSession(host, room, name);
    connect(host, room, name);
  }, [enabled, status, savedSession, pathname, connect, saveSession]);

  // Auto-navigate when the game phase changes
  const phase = gameState?.phase;
  const roomId = gameState?.id;
  useEffect(() => {
    if (!enabled || !phase || !roomId || !playerId || !shouldFollowPhase(status)) return;
    const correctRoute = getRouteForPhase(phase, roomId);
    if (isGameRoute(pathname) && pathname !== correctRoute) {
      router.replace(correctRoute);
    }
  }, [enabled, status, phase, roomId, playerId, pathname, router]);

  const handleConnect = useCallback((host: string, room: string, name: string, roomSettings?: RoomSettings) => {
    if (!enabled) {
      connect(host, room, name, roomSettings);
      return;
    }
    saveSession(host, room, name);
    clearUrlParams();
    connect(host, room, name, roomSettings);
    router.push(`/lobby/${room}`);
  }, [enabled, connect, saveSession, clearUrlParams, router]);

  // Leave game handlers (home, or a given page such as the tournament)
  const handleLeaveGameTo = useCallback(async (path: string) => {
    if (!enabled) {
      await leaveGame();
      return;
    }
    clearSession();
    await leaveGame();
    router.push(path);
  }, [enabled, leaveGame, clearSession, router]);

  // Leaving a tournament table leads back to its tournament, any other room to the home page.
  const leaveDestination = tournament.tournamentMatch ? TOURNAMENT_ROUTES.detail(tournament.tournamentMatch.tournamentId) : '/';
  const handleLeaveGame = useCallback(() => handleLeaveGameTo(leaveDestination), [handleLeaveGameTo, leaveDestination]);

  // A tournament table that refused us must not be rejoined from the saved session on every visit.
  const refusedRoom = tournament.tournamentRejection?.roomId ?? null;
  const savedRoom = savedSession?.room ?? null;
  useEffect(() => {
    if (enabled && refusedRoom !== null && refusedRoom === savedRoom) clearSession();
  }, [enabled, refusedRoom, savedRoom, clearSession]);

  const handleDisconnect = useCallback(async () => {
    if (!enabled) {
      await disconnect();
      return;
    }
    clearSession();
    await disconnect();
    router.push('/');
  }, [enabled, disconnect, clearSession, router]);

  return {
    handleConnect,
    handleLeaveGame,
    handleDisconnect,
  };
}
