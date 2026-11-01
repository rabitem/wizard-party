import { ROOM_CODE_MAX, ROOM_CODE_MIN } from './utils';

/** Pulls the room code out of an invite link (`/join?room=`, `/?room=`, `/lobby/<code>`). */
function roomCodeFromLink(raw: string): string | null {
  if (!/[/?=]/.test(raw)) return null;
  const roomParam = raw.match(/[?&]room=([^&#\s]+)/i);
  if (roomParam) return roomParam[1];
  const lobbyPath = raw.match(/\/lobby\/([^/?#\s]+)/i);
  return lobbyPath ? lobbyPath[1] : null;
}

/**
 * Turns whatever the player typed or pasted into a room code: plain codes are lowercased and
 * stripped of separators, invite links are reduced to the code they point at.
 */
export function parseRoomCodeInput(raw: string): string {
  const source = roomCodeFromLink(raw.trim()) ?? raw;
  return source.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, ROOM_CODE_MAX);
}

export function isValidRoomCode(code: string): boolean {
  return code.length >= ROOM_CODE_MIN && code.length <= ROOM_CODE_MAX;
}
