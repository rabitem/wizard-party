const PLAYER_ID_KEY = 'wizard-party-player-id';

/**
 * Get or create a persistent player ID for reconnection
 */
export function getOrCreatePlayerId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = `player-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}
