/**
 * One browser as the game client sees it: its reconnect id (localStorage), the seat token it keeps
 * per room and the tournament match tickets of its tabs. Two tabs of one browser share a profile;
 * a private window or another device is a new profile.
 */
import type { SeatTokenStore } from '@/presentation/hooks/connection/game-session.types';
import type { TicketStorage } from '@/presentation/hooks/connection/tournament-join';
import { persistentIdOf } from '../../../party/test-support/room-harness';

export interface BrowserProfile {
  readonly label: string;
  /** The browser's reconnect id, valid for the room (created at the harness start time). */
  readonly persistentId: string;
  readonly seatTokens: SeatTokenStore;
  readonly tickets: TicketStorage;
}

class MemorySeatTokens implements SeatTokenStore {
  private readonly tokens = new Map<string, string>();

  load(roomId: string): string | undefined {
    return this.tokens.get(roomId);
  }

  save(roomId: string, token: string): void {
    this.tokens.set(roomId, token);
  }

  forget(roomId: string): void {
    this.tokens.delete(roomId);
  }
}

class MemoryTickets implements TicketStorage {
  private readonly items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }
}

/** The `index`-th browser of a table; its reconnect id is unique among them. */
export function createBrowserProfile(index: number, label = `browser ${index}`): BrowserProfile {
  return {
    label,
    persistentId: persistentIdOf(`b${String(index).padStart(6, '0')}`),
    seatTokens: new MemorySeatTokens(),
    tickets: new MemoryTickets(),
  };
}
