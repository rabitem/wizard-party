/**
 * Game Provider Utilities
 * Helper functions for the GameProvider
 */

import { GamePhase } from '@shared/domain';

/**
 * Determines the correct route for a given game phase
 * @param phase - The current game phase
 * @param roomId - The room ID
 * @returns The route path for the given phase
 */
export function getRouteForPhase(phase: GamePhase, roomId: string): string {
  switch (phase) {
    case GamePhase.LOBBY:
      return `/lobby/${roomId}`;
    case GamePhase.GAME_END:
      return `/results/${roomId}`;
    case GamePhase.DEALING:
    case GamePhase.TRUMP_SELECTION:
    case GamePhase.BIDDING:
    case GamePhase.PLAYING:
    case GamePhase.ROUND_END:
    // Never a phase of a game the client holds (pauses keep their phase); routed safely anyway.
    case GamePhase.PAUSED:
      return `/game/${roomId}`;
    default:
      return '/';
  }
}

/**
 * Checks if the current pathname is a game-related route
 * @param pathname - The current URL pathname
 * @returns True if the pathname is a game-related route
 */
export function isGameRoute(pathname: string): boolean {
  return pathname.startsWith('/lobby/') ||
         pathname.startsWith('/game/') ||
         pathname.startsWith('/results/');
}

const GAME_ROUTE_ROOM = /^\/(?:lobby|game|results)\/([^/?#]+)/;

/**
 * The room a game route belongs to (`/game/ydu3kh` -> `ydu3kh`), null elsewhere.
 * A page load rejoins this room, not the saved session's: the saved session is shared by every tab,
 * so another tab that opened a room would otherwise pull a refreshed game tab into that room.
 */
export function getRouteRoomId(pathname: string): string | null {
  const match = GAME_ROUTE_ROOM.exec(pathname);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
