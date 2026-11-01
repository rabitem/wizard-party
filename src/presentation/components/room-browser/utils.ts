import { LOCAL_REALTIME_HOST } from '@shared/realtime/realtime-host';
import { IS_REALTIME_HOST_CONFIGURED, REALTIME_HOST } from '@/config/deployment.config';
import { CONSTANTS } from '@/presentation/config/constants';
import type { RoomSettings } from '@/presentation/types';

// Room code validation limits (kept here as this is validation logic)
export const ROOM_CODE_MIN = 4;
export const ROOM_CODE_MAX = 8;

/**
 * @deprecated Use CONSTANTS.STORAGE_KEYS.USERNAME instead
 * Kept for backwards compatibility
 */
export const USERNAME_KEY = CONSTANTS.STORAGE_KEYS.USERNAME;

/**
 * @deprecated Use CONSTANTS.STORAGE_KEYS.RECENT_ROOMS instead
 * Kept for backwards compatibility
 */
export const RECENT_ROOMS_KEY = CONSTANTS.STORAGE_KEYS.RECENT_ROOMS;

// A function, not a constant: the localhost check needs the browser (avoids an SSR hydration mismatch).
export function getDefaultHost(): string {
  if (IS_REALTIME_HOST_CONFIGURED) return REALTIME_HOST;
  // A production build served locally (E2E suites) plays against the local worker.
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return LOCAL_REALTIME_HOST;
  }
  return REALTIME_HOST;
}

// Re-export RoomSettings type for backwards compatibility
export type { RoomSettings };

export interface RecentRoom {
  id: string;
  name: string;
  host: string;
  lastJoined: number;
}

export function generateRoomId(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
