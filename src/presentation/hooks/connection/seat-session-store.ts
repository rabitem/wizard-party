import { safeLocalStorage } from '@/lib/storage';
import { CONSTANTS } from '@/presentation/config/constants';

/**
 * The secret session tokens the game server issued to this browser, one per room (SESSION
 * message). A token is what resumes the seat after a reload or reconnect; the public player id
 * that every player sees is not. Tokens live as long as a saved session and are bounded in number.
 * Where storage is blocked or full, SafeStorage keeps them in memory, so the seat can still be
 * resumed for the rest of the visit.
 */

interface StoredSeatSession {
  token: string;
  savedAt: number;
}

type SeatSessions = Record<string, StoredSeatSession>;

const SEAT_SESSION_LIMITS = {
  /** Rooms remembered at once; the oldest is dropped beyond this. */
  MAX_ROOMS: 20,
  /** A seat is not resumable for longer than a saved session lasts. */
  TTL_MS: CONSTANTS.TIMING.SESSION_TTL_MS,
} as const;

function isStoredSeatSession(value: unknown): value is StoredSeatSession {
  const entry = value as Partial<StoredSeatSession> | null;
  return typeof entry?.token === 'string' && typeof entry.savedAt === 'number';
}

function readAll(now: number): SeatSessions {
  const parsed = safeLocalStorage.readJson(CONSTANTS.STORAGE_KEYS.SEAT_SESSIONS);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
  return Object.fromEntries(
    Object.entries(parsed).filter(
      ([, entry]) => isStoredSeatSession(entry) && now - entry.savedAt <= SEAT_SESSION_LIMITS.TTL_MS
    )
  ) as SeatSessions;
}

function writeAll(sessions: SeatSessions): void {
  const newestFirst = Object.entries(sessions)
    .sort(([, a], [, b]) => b.savedAt - a.savedAt)
    .slice(0, SEAT_SESSION_LIMITS.MAX_ROOMS);
  safeLocalStorage.writeJson(CONSTANTS.STORAGE_KEYS.SEAT_SESSIONS, Object.fromEntries(newestFirst));
}

/** The token of this browser's seat in `roomId`, if it has one. */
export function loadSeatToken(roomId: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return readAll(Date.now())[roomId]?.token;
}

export function saveSeatToken(roomId: string, token: string): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  writeAll({ ...readAll(now), [roomId]: { token, savedAt: now } });
}

/** Forgets the seat (the host removed the player from the room). */
export function forgetSeatToken(roomId: string): void {
  if (typeof window === 'undefined') return;
  const sessions = readAll(Date.now());
  if (!(roomId in sessions)) return;
  delete sessions[roomId];
  writeAll(sessions);
}
