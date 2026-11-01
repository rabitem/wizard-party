import { DEFAULT_ROOM_SETTINGS, ensureRoomSettings } from '@shared/domain';
import { safeSessionStorage } from '@/lib/storage';
import type { RoomSettings } from '@/presentation/types';
import { normalizePartyHostInput } from './room-host';

export const PENDING_ROOM_STORAGE_KEY = 'wizard-party-pending-room';

export interface PendingRoomSetup {
  roomId: string;
  host: string;
  isCreator: boolean;
  settings?: RoomSettings;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

/** Never throws, even where site data is blocked (the setup then lives for this visit only). */
function getSessionStorage(): typeof safeSessionStorage | null {
  return typeof window === 'undefined' ? null : safeSessionStorage;
}

function normalizePendingSettings(settings: unknown, roomId: string): RoomSettings | undefined {
  if (!isRecord(settings)) return undefined;
  return ensureRoomSettings(settings, { ...DEFAULT_ROOM_SETTINGS, name: roomId });
}

function normalizePendingSetup(value: unknown): PendingRoomSetup | null {
  if (!isRecord(value)) return null;

  const roomId = typeof value.roomId === 'string' ? value.roomId.trim().toLowerCase() : '';
  const host = typeof value.host === 'string' ? normalizePartyHostInput(value.host) : '';
  if (!roomId || !host) return null;

  const settings = normalizePendingSettings(value.settings, roomId);
  return {
    roomId,
    host,
    isCreator: value.isCreator === true,
    ...(settings ? { settings } : {}),
  };
}

export function parsePendingRoomSetup(serialized: string | null): PendingRoomSetup | null {
  if (!serialized) return null;
  try {
    return normalizePendingSetup(JSON.parse(serialized));
  } catch {
    return null;
  }
}

export function serializePendingRoomSetup(setup: PendingRoomSetup): string {
  const normalized = normalizePendingSetup(setup);
  return JSON.stringify(normalized);
}

export function savePendingRoomSetup(setup: PendingRoomSetup): void {
  const storage = getSessionStorage();
  if (!storage) return;
  storage.setItem(PENDING_ROOM_STORAGE_KEY, serializePendingRoomSetup(setup));
}

export function getPendingRoomSetupForRoom(roomId: string): PendingRoomSetup | null {
  const storage = getSessionStorage();
  if (!storage) return null;

  const setup = parsePendingRoomSetup(storage.getItem(PENDING_ROOM_STORAGE_KEY));
  if (!setup) return null;

  return setup.roomId === roomId.toLowerCase() ? setup : null;
}

export function clearPendingRoomSetupForRoom(roomId: string): boolean {
  const storage = getSessionStorage();
  const setup = getPendingRoomSetupForRoom(roomId);
  if (!setup || !storage) return false;

  storage.removeItem(PENDING_ROOM_STORAGE_KEY);
  return true;
}
