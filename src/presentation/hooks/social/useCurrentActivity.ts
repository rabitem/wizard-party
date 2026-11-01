'use client';

import { useMemo } from 'react';

import { GamePhase } from '@shared/domain';
import type { PresenceActivity } from '@shared/domain/social';
import { isTournamentRoomCode } from '@shared/domain/tournament';

import { useGame } from '@/presentation/providers/GameProvider';

/** What the player is doing right now, as reported to friends: menus, a lobby or a running game. */
export function useCurrentActivity(): PresenceActivity {
  const { isConnected, gameState } = useGame();
  const roomCode = isConnected ? gameState?.id ?? null : null;
  // A tournament table only seats its roster, so friends must not be offered to join its lobby.
  const inLobby = gameState?.phase === GamePhase.LOBBY && !isTournamentRoomCode(roomCode);
  // The seat is attested by the game worker on the server; the client never names it.
  return useMemo<PresenceActivity>(
    () => (roomCode ? { kind: inLobby ? 'lobby' : 'game', roomCode, gamePlayerId: null } : { kind: 'menu' }),
    [roomCode, inLobby]
  );
}
