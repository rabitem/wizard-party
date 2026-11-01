import { accountApi } from './account-api';

/*
 * The signed-in player's character ticket for the game rooms. It is fetched once the account is
 * known, sent with every JOIN_GAME, and fetched again before it expires or after a new look is
 * saved. Joining waits until the fetch has settled (usePlayerName), so the first JOIN_GAME
 * already carries it; a failed fetch joins without a look rather than not at all.
 */

const TICKET_CLIENT = {
  /** A slow or missing ticket must not keep a player from the table for long. */
  FETCH_TIMEOUT_MS: 3000,
  /** A ticket this close to expiry is fetched again instead of sent. */
  REFRESH_MARGIN_MS: 10 * 60 * 1000,
} as const;

interface TicketState {
  userId: string;
  /** Null once a fetch failed (no secret configured, offline): join without a look. */
  ticket: { value: string; expiresAt: number } | null;
}

let state: TicketState | null = null;
let fetching: string | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeCharacterTicket(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isFresh(ticket: TicketState['ticket'], now: number): boolean {
  return ticket !== null && ticket.expiresAt - TICKET_CLIENT.REFRESH_MARGIN_MS > now;
}

/**
 * Fetches a ticket for this account unless a fresh one is held or on its way. `renew` fetches
 * anyway (a new look was saved); the held ticket is still sent until the new one arrives.
 */
export function requestCharacterTicket(userId: string, { now = Date.now(), renew = false }: { now?: number; renew?: boolean } = {}): void {
  if (fetching === userId) return;
  const held = state?.userId === userId ? state.ticket : undefined;
  if (!renew && held !== undefined && (held === null || isFresh(held, now))) return;
  fetching = userId;
  accountApi.characterTicket(AbortSignal.timeout(TICKET_CLIENT.FETCH_TIMEOUT_MS)).then(
    ({ ticket, expiresAt }) => ({ value: ticket, expiresAt }),
    () => null
  ).then((ticket) => {
    if (fetching !== userId) return;
    fetching = null;
    state = { userId, ticket };
    notify();
  });
}

/** True once this account's first ticket fetch has settled, with a ticket or without one. */
export function isCharacterTicketSettled(userId: string): boolean {
  return state?.userId === userId;
}

/** Signed out: the held ticket no longer speaks for whoever plays in this browser. */
export function forgetCharacterTicket(): void {
  if (state === null && fetching === null) return;
  state = null;
  fetching = null;
  notify();
}

/** Spread into JOIN_GAME: the held ticket while it is fresh (it is refreshed in the background). */
export function characterTicketJoinFields(now: number = Date.now()): { appearanceTicket?: string } {
  if (!state?.ticket) return {};
  if (!isFresh(state.ticket, now)) {
    requestCharacterTicket(state.userId, { now });
    // Still valid on the worker for up to REFRESH_MARGIN_MS: better than no look.
    return state.ticket.expiresAt > now ? { appearanceTicket: state.ticket.value } : {};
  }
  return { appearanceTicket: state.ticket.value };
}
