export const ROOM_CODE_MIN = 4;
export const ROOM_CODE_MAX = 8;
export const USERNAME_KEY = 'wizard-party-username';
export const RECENT_ROOMS_KEY = 'wizard-party-recent-rooms';

// Use a function to get the host to avoid SSR hydration mismatch
export function getDefaultHost(): string {
  if (process.env.NEXT_PUBLIC_PARTYKIT_HOST) {
    return process.env.NEXT_PUBLIC_PARTYKIT_HOST;
  }
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'localhost:1999';
  }
  return 'wizard-party.rabitem.partykit.dev';
}

// For backwards compatibility - but prefer getDefaultHost() in components
export const DEFAULT_HOST = 'wizard-party.rabitem.partykit.dev';

export interface RoomSettings {
  name: string;
  isPublic: boolean;
  maxPlayers: number;
  password?: string;
}

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
