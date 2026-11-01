import { describe, expect, it } from 'vitest';

import { LEGACY_PROTOCOL_VERSION, PROTOCOL_VERSION, SessionRejectedError } from '../../../domain';
import type { ISeatSessionStore } from '../../ports/seat-sessions.port';
import { claimSeat, usesSessionTokens } from './seat-claim';

const ALICE_BROWSER = 'player-1700000000000-alice01';
const LEGACY_SEAT = 'player-1700000000000-legacy1';
const TOKEN = 'T'.repeat(43);

interface FakeRoom {
  persistentIds?: Record<string, string>;
  tokens?: Record<string, string>;
  seated?: string[];
}

function store({ persistentIds = {}, tokens = {}, seated = [] }: FakeRoom): ISeatSessionStore {
  return {
    seatOfPersistentId: (persistentId) => persistentIds[persistentId],
    seatOfToken: (token) => Object.entries(tokens).find(([, issued]) => issued === token)?.[0],
    hasToken: (playerId) => playerId in tokens,
    isSeated: (playerId) => seated.includes(playerId),
  };
}

describe('claimSeat', () => {
  it('resumes the seat a session token was issued for', () => {
    const room = store({ persistentIds: { [ALICE_BROWSER]: 'p_alice' }, tokens: { p_alice: TOKEN }, seated: ['p_alice'] });

    expect(claimSeat({ persistentId: ALICE_BROWSER, sessionToken: TOKEN, protocolVersion: PROTOCOL_VERSION }, room))
      .toEqual({ kind: 'resume', playerId: 'p_alice', proof: 'session-token' });
  });

  it('refuses a persistent id that names a token-protected seat without its token', () => {
    const room = store({ persistentIds: { [ALICE_BROWSER]: 'p_alice' }, tokens: { p_alice: TOKEN }, seated: ['p_alice'] });

    expect(() => claimSeat({ persistentId: ALICE_BROWSER, protocolVersion: PROTOCOL_VERSION }, room))
      .toThrow(SessionRejectedError);
    expect(() => claimSeat({ persistentId: ALICE_BROWSER, sessionToken: 'W'.repeat(43), protocolVersion: PROTOCOL_VERSION }, room))
      .toThrow(SessionRejectedError);
    // A legacy client cannot fall back to the persistent id either.
    expect(() => claimSeat({ persistentId: ALICE_BROWSER, protocolVersion: LEGACY_PROTOCOL_VERSION }, room))
      .toThrow(SessionRejectedError);
  });

  it('lets a seat that never received a token be resumed by its persistent id (migration)', () => {
    const room = store({ persistentIds: { [LEGACY_SEAT]: LEGACY_SEAT }, seated: [LEGACY_SEAT] });

    expect(claimSeat({ persistentId: LEGACY_SEAT, protocolVersion: LEGACY_PROTOCOL_VERSION }, room))
      .toEqual({ kind: 'resume', playerId: LEGACY_SEAT, proof: 'legacy-persistent-id' });
    expect(claimSeat({ persistentId: LEGACY_SEAT, protocolVersion: PROTOCOL_VERSION }, room))
      .toEqual({ kind: 'resume', playerId: LEGACY_SEAT, proof: 'legacy-persistent-id' });
  });

  it('resumes an attested seat even when it is token-protected (a verified tournament ticket)', () => {
    const room = store({ tokens: { p_alice: TOKEN }, seated: ['p_alice'] });

    expect(claimSeat({ persistentId: 'player-1700000000000-phone01', protocolVersion: PROTOCOL_VERSION, attestedPlayerId: 'p_alice' }, room))
      .toEqual({ kind: 'resume', playerId: 'p_alice', proof: 'attested' });
  });

  it('ignores an attested seat that is no longer in the game', () => {
    expect(claimSeat({ persistentId: ALICE_BROWSER, protocolVersion: PROTOCOL_VERSION, attestedPlayerId: 'p_gone' }, store({})))
      .toEqual({ kind: 'new' });
  });

  it('creates a new seat when nothing maps to the caller', () => {
    expect(claimSeat({ persistentId: ALICE_BROWSER, protocolVersion: PROTOCOL_VERSION }, store({}))).toEqual({ kind: 'new' });
  });

  it('ignores tokens and persistent ids of seats that are no longer in the game', () => {
    const room = store({ persistentIds: { [ALICE_BROWSER]: 'p_gone' }, tokens: { p_gone: TOKEN } });

    expect(claimSeat({ persistentId: ALICE_BROWSER, sessionToken: TOKEN, protocolVersion: PROTOCOL_VERSION }, room))
      .toEqual({ kind: 'new' });
  });
});

describe('usesSessionTokens', () => {
  it('is false for the legacy protocol and true for the current one', () => {
    expect(usesSessionTokens(LEGACY_PROTOCOL_VERSION)).toBe(false);
    expect(usesSessionTokens(PROTOCOL_VERSION)).toBe(true);
  });
});
