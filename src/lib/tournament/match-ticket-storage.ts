import { tournamentTicketStorageKey } from '@shared/tournament/tournament-wire';
import { safeSessionStorage } from '@/lib/storage';

/**
 * The browser's hand-off of a match ticket from the tournament page to the game connection:
 * kept in sessionStorage (per tab, gone with it) under tournamentTicketStorageKey(roomCode), so
 * the connection can send it with JOIN_GAME and again on every reconnect (the worker seats nobody
 * without one; after expiry it only lets its holder back into a seat they already hold).
 */
export interface StoredMatchTicket {
  ticket: string;
  tournamentId: string;
  /** Epoch ms; after this the worker seats nobody new with the ticket. */
  expiresAt: number;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Never throws: disabled storage (privacy mode, sandboxed frame) keeps the ticket for this page. */
function sessionStore(): StorageLike | null {
  return typeof window === 'undefined' ? null : safeSessionStorage;
}

export function parseStoredMatchTicket(raw: string | null): StoredMatchTicket | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredMatchTicket> | null;
    if (!value || typeof value.ticket !== 'string' || !value.ticket) return null;
    if (typeof value.tournamentId !== 'string' || !value.tournamentId) return null;
    if (typeof value.expiresAt !== 'number' || !Number.isFinite(value.expiresAt)) return null;
    return { ticket: value.ticket, tournamentId: value.tournamentId, expiresAt: value.expiresAt };
  } catch {
    return null;
  }
}

/** Returns false when the browser refused to store it (the join would then fail). */
export function saveMatchTicket(roomCode: string, ticket: StoredMatchTicket, storage: StorageLike | null = sessionStore()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(tournamentTicketStorageKey(roomCode), JSON.stringify(ticket));
    return true;
  } catch {
    return false;
  }
}

export function clearMatchTicket(roomCode: string, storage: StorageLike | null = sessionStore()): void {
  try {
    storage?.removeItem(tournamentTicketStorageKey(roomCode));
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
}
