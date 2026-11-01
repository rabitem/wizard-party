import { describe, expect, it } from 'vitest';
import { DEFAULT_APPEARANCE } from '../domain/character';

import { signCharacterTicket, ticketLookForSeat, verifyCharacterTicket, type CharacterTicketClaims } from './character-ticket';

const SECRET = 'character-ticket-test-secret';
const NOW = 1_800_000_000_000;
const CLAIMS: CharacterTicketClaims = { v: 1, name: 'Merlin', appearance: { ...DEFAULT_APPEARANCE, palette: 'palette:forest' }, exp: NOW + 60_000 };

describe('character tickets', () => {
  it('should verify a ticket signed with the same secret', async () => {
    const ticket = await signCharacterTicket(SECRET, CLAIMS);
    await expect(verifyCharacterTicket(SECRET, ticket, NOW)).resolves.toEqual({ ok: true, claims: CLAIMS });
  });

  it('should refuse a ticket signed with another secret or edited after signing', async () => {
    const ticket = await signCharacterTicket(SECRET, CLAIMS);
    await expect(verifyCharacterTicket('another-secret', ticket, NOW)).resolves.toEqual({ ok: false, reason: 'bad_signature' });

    const [prefix, , signature] = ticket.split('.');
    const forged = `${prefix}.${btoa(JSON.stringify({ ...CLAIMS, name: 'Morgana' })).replace(/=+$/, '')}.${signature}`;
    await expect(verifyCharacterTicket(SECRET, forged, NOW)).resolves.toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('should refuse an expired ticket, a look that breaks the rules and anything that is no ticket', async () => {
    await expect(verifyCharacterTicket(SECRET, await signCharacterTicket(SECRET, CLAIMS), CLAIMS.exp)).resolves.toEqual({ ok: false, reason: 'expired' });

    const staffAndShield = { ...CLAIMS, appearance: { ...DEFAULT_APPEARANCE, mainHand: 'main:staff', offHand: 'off:round-shield' } };
    await expect(verifyCharacterTicket(SECRET, await signCharacterTicket(SECRET, staffAndShield), NOW)).resolves.toEqual({ ok: false, reason: 'invalid_claims' });

    const garbage = [undefined, 42, '', 'c1.only-two', 'x1.a.b', 'c1.a.b'.padEnd(4096, 'b')];
    const verdicts = await Promise.all(garbage.map((ticket) => verifyCharacterTicket(SECRET, ticket, NOW)));
    expect(verdicts.every((verdict) => !verdict.ok)).toBe(true);
  });

  it('should grant the look only to the seat with the ticket\'s name, in any casing', () => {
    expect(ticketLookForSeat(CLAIMS, 'merlin')).toEqual(CLAIMS.appearance);
    expect(ticketLookForSeat(CLAIMS, 'Morgana')).toBeNull();
  });
});
