import { beforeEach, describe, expect, it, vi } from 'vitest';

const characterTicket = vi.fn();
vi.mock('./account-api', () => ({ accountApi: { characterTicket: (...args: unknown[]) => characterTicket(...args) } }));

const NOW = 1_800_000_000_000;
const HOUR = 60 * 60 * 1000;

/** The store keeps module state: every test starts from a fresh copy. */
async function freshStore() {
  vi.resetModules();
  return import('./character-ticket');
}

describe('character ticket store', () => {
  beforeEach(() => {
    characterTicket.mockReset();
  });

  it('should hold the join until the fetch settles, then send the ticket with every join', async () => {
    characterTicket.mockResolvedValue({ ticket: 'c1.ticket.sig', expiresAt: NOW + 12 * HOUR });
    const store = await freshStore();

    store.requestCharacterTicket('user-1', { now: NOW });
    expect(store.isCharacterTicketSettled('user-1')).toBe(false);
    await vi.waitFor(() => expect(store.isCharacterTicketSettled('user-1')).toBe(true));

    expect(store.characterTicketJoinFields(NOW)).toEqual({ appearanceTicket: 'c1.ticket.sig' });
    store.requestCharacterTicket('user-1', { now: NOW });
    expect(characterTicket).toHaveBeenCalledTimes(1);
  });

  it('should let a player join without a look when no ticket can be had', async () => {
    characterTicket.mockRejectedValue(new Error('unavailable'));
    const store = await freshStore();

    store.requestCharacterTicket('user-1', { now: NOW });
    await vi.waitFor(() => expect(store.isCharacterTicketSettled('user-1')).toBe(true));

    expect(store.characterTicketJoinFields(NOW)).toEqual({});
  });

  it('should still send a ticket close to expiry while fetching the next, and none once it expired', async () => {
    characterTicket.mockResolvedValueOnce({ ticket: 'c1.old.sig', expiresAt: NOW + 5 * 60 * 1000 });
    characterTicket.mockReturnValueOnce(new Promise(() => {
      // The next ticket is still on its way.
    }));
    const store = await freshStore();
    store.requestCharacterTicket('user-1', { now: NOW });
    await vi.waitFor(() => expect(store.isCharacterTicketSettled('user-1')).toBe(true));

    expect(store.characterTicketJoinFields(NOW)).toEqual({ appearanceTicket: 'c1.old.sig' });
    expect(characterTicket).toHaveBeenCalledTimes(2);
    expect(store.characterTicketJoinFields(NOW + HOUR)).toEqual({});
  });
});
