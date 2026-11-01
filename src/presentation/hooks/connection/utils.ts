import { safeLocalStorage } from '@/lib/storage';
import { CONSTANTS } from '@/presentation/config/constants';

/**
 * Get or create a persistent player ID for reconnection. Where storage is blocked the id lives
 * in SafeStorage's memory overlay, so it stays the same for the whole visit.
 */
export function getOrCreatePlayerId(): string {
  if (typeof window === 'undefined') return '';
  const existing = safeLocalStorage.getItem(CONSTANTS.STORAGE_KEYS.PLAYER_ID);
  if (existing) return existing;
  const id = `player-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  safeLocalStorage.setItem(CONSTANTS.STORAGE_KEYS.PLAYER_ID, id);
  return id;
}
