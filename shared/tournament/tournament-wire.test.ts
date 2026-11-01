import { describe, expect, it } from 'vitest';

import { BotDifficulty } from '../domain/bot-ai/types';
import { matchIdFor, matchRoomCode } from '../domain/tournament/tournament-ids';
import { DEFAULT_RULESET_CONFIG } from '../domain/value-objects/ruleset-config';
import { base64UrlToBytes, base64UrlToText, bytesToBase64Url, textToBase64Url } from './base64url';
import { cryptoTournamentIds } from './crypto-tournament-ids';
import {
  buildMatchResultRequest,
  parseMatchResultReport,
  parseRecordResultOutcome,
  signMatchResultRequest,
  toMatchReport,
  verifyMatchResultSignature,
  type MatchResultReport,
} from './match-result-report';
import { matchReportKind, parseMatchProgressReport, toMatchProgress, type MatchProgressReport } from './match-progress-report';
import { parseMatchTicketClaims, signMatchTicket, verifyMatchTicket, type MatchTicketClaims } from './match-ticket';
import { TOURNAMENT_RESULT_HEADERS, tournamentTicketStorageKey } from './tournament-wire';

const SECRET = 'test-secret';
const NOW = 1_800_000_000_000;
const TID = 'abcdefghjk23';
const MID = matchIdFor(TID, 2, 1);
const ROOM = matchRoomCode(MID);

function claims(overrides: Partial<MatchTicketClaims> = {}): MatchTicketClaims {
  return {
    v: 1,
    tid: TID,
    mid: MID,
    room: ROOM,
    uid: 'user-a',
    name: 'Merlin',
    exp: NOW + 60_000,
    match: {
      round: 2,
      table: 1,
      roster: [
        { uid: 'user-a', name: 'Merlin', seat: 1 },
        { uid: 'user-b', name: 'Morgana', seat: 0 },
      ],
      bots: 1,
      botDifficulty: BotDifficulty.MEDIUM,
      rulesetConfig: DEFAULT_RULESET_CONFIG,
      label: 'Spring Cup · Final',
    },
    ...overrides,
  };
}

function report(overrides: Partial<MatchResultReport> = {}): MatchResultReport {
  return {
    v: 1,
    tid: TID,
    mid: MID,
    room: ROOM,
    gameId: 'game_123',
    completedAt: NOW,
    standings: [
      { uid: 'user-a', placement: 1, score: 120, rounds: [{ bid: 1, tricksWon: 1, roundScore: 30 }], noShow: false, botTakeover: false },
      { uid: 'user-b', placement: 3, score: 0, rounds: [], noShow: true, botTakeover: false },
    ],
    ...overrides,
  };
}

function progress(overrides: Partial<MatchProgressReport> = {}): MatchProgressReport {
  return { v: 1, kind: 'progress', tid: TID, mid: MID, room: ROOM, gameId: 'game_123', round: 3, maxRounds: 15, at: NOW, ...overrides };
}

describe('base64url', () => {
  it('round-trips bytes and unicode text', () => {
    const bytes = new Uint8Array([0, 251, 255, 62, 63]);
    expect(base64UrlToBytes(bytesToBase64Url(bytes))).toEqual(bytes);
    expect(base64UrlToText(textToBase64Url('Spring Cup · Ünïcode 🙂'))).toBe('Spring Cup · Ünïcode 🙂');
    expect(bytesToBase64Url(bytes)).not.toMatch(/[+/=]/);
    expect(base64UrlToBytes('a+b')).toBeNull();
    expect(base64UrlToBytes('a')).toBeNull();
  });
});

describe('match tickets', () => {
  it('verifies a ticket it signed', async () => {
    const ticket = await signMatchTicket(SECRET, claims());
    expect(ticket.split('.')).toHaveLength(3);
    expect(ticket.startsWith('v1.')).toBe(true);
    const result = await verifyMatchTicket({ secret: SECRET, ticket, now: NOW, roomCode: ROOM });
    expect(result).toEqual({ ok: true, claims: claims() });
  });

  it('rejects forged, tampered, expired and misplaced tickets', async () => {
    const ticket = await signMatchTicket(SECRET, claims());
    const [prefix, payload, signature] = ticket.split('.');
    const verify = (value: unknown, overrides: { now?: number; roomCode?: string; secret?: string } = {}) =>
      verifyMatchTicket({ secret: overrides.secret ?? SECRET, ticket: value, now: overrides.now ?? NOW, roomCode: overrides.roomCode ?? ROOM });

    expect(await verify(ticket, { secret: 'other' })).toEqual({ ok: false, reason: 'bad_signature' });
    const tampered = textToBase64Url(JSON.stringify({ ...claims(), uid: 'user-b', name: 'Morgana' }));
    expect(await verify(`${prefix}.${tampered}.${signature}`)).toEqual({ ok: false, reason: 'bad_signature' });
    // An expired ticket keeps its claims (the worker lets it take back a seat already held)...
    expect(await verify(ticket, { now: NOW + 60_000 })).toEqual({ ok: false, reason: 'expired', claims: claims() });
    expect(await verify(ticket, { roomCode: 't-otherroom2345' })).toEqual({ ok: false, reason: 'wrong_room' });
    // ...but only in its own room.
    expect(await verify(ticket, { now: NOW + 60_000, roomCode: 't-otherroom2345' })).toEqual({ ok: false, reason: 'wrong_room' });
    expect(await verify('v2.x.y')).toEqual({ ok: false, reason: 'malformed' });
    expect(await verify(`${prefix}.${payload}`)).toEqual({ ok: false, reason: 'malformed' });
    expect(await verify(42)).toEqual({ ok: false, reason: 'malformed' });
    expect(await verify(`v1.${'a'.repeat(9000)}.b`)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects signed claims that are inconsistent', async () => {
    const signedBad = (overrides: Partial<MatchTicketClaims>) => signMatchTicket(SECRET, claims(overrides));
    const verify = async (ticket: Promise<string>) => (await verifyMatchTicket({ secret: SECRET, ticket: await ticket, now: NOW, roomCode: ROOM })).ok;
    expect(await verify(signedBad({ room: 't-otherroom2345' }))).toBe(false);
    expect(await verify(signedBad({ uid: 'stranger' }))).toBe(false);
    expect(await verify(signedBad({ name: 'Impostor' }))).toBe(false);
    expect(await verify(signedBad({ tid: 'zzzzzzzzzz22' }))).toBe(false);
  });

  it('validates the match descriptor', () => {
    const base = claims();
    expect(parseMatchTicketClaims(base)).not.toBeNull();
    expect(parseMatchTicketClaims({ ...base, match: { ...base.match, round: 3 } })).toBeNull();
    expect(parseMatchTicketClaims({ ...base, match: { ...base.match, bots: 0 } })).toBeNull();
    expect(parseMatchTicketClaims({ ...base, match: { ...base.match, bots: 5 } })).toBeNull();
    expect(parseMatchTicketClaims({ ...base, match: { ...base.match, botDifficulty: 42 } })).toBeNull();
    expect(parseMatchTicketClaims({ ...base, match: { ...base.match, rulesetConfig: null } })).toBeNull();
    const duplicateSeat = { ...base.match, roster: [base.match.roster[0], { uid: 'user-b', name: 'Morgana', seat: 1 }] };
    expect(parseMatchTicketClaims({ ...base, match: duplicateSeat })).toBeNull();
    const badName = { ...base.match, roster: [{ uid: 'user-a', name: 'Mer.lin', seat: 1 }, base.match.roster[1]] };
    expect(parseMatchTicketClaims({ ...base, name: 'Mer.lin', match: badName })).toBeNull();
  });

  it('carries the match deadline, and keeps tickets without one valid', async () => {
    const withDeadline = claims({ match: { ...claims().match, deadlineAt: NOW + 3_600_000 } });
    const verified = await verifyMatchTicket({ secret: SECRET, ticket: await signMatchTicket(SECRET, withDeadline), now: NOW, roomCode: ROOM });
    expect(verified).toEqual({ ok: true, claims: withDeadline });

    const older = parseMatchTicketClaims(claims());
    expect(older).not.toBeNull();
    expect(older?.match).not.toHaveProperty('deadlineAt');
    expect(parseMatchTicketClaims({ ...withDeadline, match: { ...withDeadline.match, deadlineAt: 'soon' } })).toBeNull();
    expect(parseMatchTicketClaims({ ...withDeadline, match: { ...withDeadline.match, deadlineAt: -1 } })).toBeNull();
  });

  it('names the session storage key per room', () => {
    expect(tournamentTicketStorageKey(ROOM)).toBe(`wizard-party-tournament-ticket:${ROOM}`);
  });
});

describe('match result reports', () => {
  it('parses a valid report and maps it to the domain', () => {
    const parsed = parseMatchResultReport(JSON.parse(JSON.stringify(report())));
    expect(parsed).toEqual(report());
    expect(toMatchReport(parsed!)).toEqual({
      matchId: MID,
      roomCode: ROOM,
      gameId: 'game_123',
      completedAt: NOW,
      players: [
        { userId: 'user-a', placement: 1, score: 120, rounds: [{ bid: 1, tricksWon: 1, roundScore: 30 }], noShow: false, botTakeover: false },
        { userId: 'user-b', placement: 3, score: 0, rounds: [], noShow: true, botTakeover: false },
      ],
    });
  });

  it('rejects malformed reports', () => {
    const base = report();
    expect(parseMatchResultReport({ ...base, v: 2 })).toBeNull();
    expect(parseMatchResultReport({ ...base, room: 't-otherroom2345' })).toBeNull();
    expect(parseMatchResultReport({ ...base, tid: 'zzzzzzzzzz22' })).toBeNull();
    expect(parseMatchResultReport({ ...base, gameId: 'has space' })).toBeNull();
    expect(parseMatchResultReport({ ...base, standings: [] })).toBeNull();
    expect(parseMatchResultReport({ ...base, standings: [base.standings[0], base.standings[0]] })).toBeNull();
    expect(parseMatchResultReport({ ...base, standings: [{ ...base.standings[0], placement: 0 }] })).toBeNull();
    expect(parseMatchResultReport({ ...base, standings: [{ ...base.standings[0], rounds: [{ bid: -1, tricksWon: 0, roundScore: 0 }] }] })).toBeNull();
    expect(parseMatchResultReport({ ...base, standings: [{ ...base.standings[0], noShow: 'no' }] })).toBeNull();
    expect(parseMatchResultReport({ ...base, standings: [{ ...base.standings[0], rounds: [{ bid: 22, tricksWon: 0, roundScore: 0 }] }] })).toBeNull();
  });

  it('accepts a 20-card bid that a Cloud raised to 21', () => {
    const cloudRaised = { bid: 21, tricksWon: 20, roundScore: -10 };
    const parsed = parseMatchResultReport({ ...report(), standings: [{ ...report().standings[0], rounds: [cloudRaised] }, report().standings[1]] });
    expect(parsed?.standings[0].rounds).toEqual([cloudRaised]);
    expect(parseMatchResultReport(null)).toBeNull();
  });

  it('signs and verifies requests within the tolerance window', async () => {
    const { body, headers } = await buildMatchResultRequest(SECRET, report(), NOW);
    const input = { secret: SECRET, signature: headers[TOURNAMENT_RESULT_HEADERS.SIGNATURE], timestamp: headers[TOURNAMENT_RESULT_HEADERS.TIMESTAMP], body, now: NOW + 1000 };
    expect(await verifyMatchResultSignature(input)).toBe(true);
    expect(await verifyMatchResultSignature({ ...input, body: body.replace('120', '999') })).toBe(false);
    expect(await verifyMatchResultSignature({ ...input, secret: 'other' })).toBe(false);
    expect(await verifyMatchResultSignature({ ...input, now: NOW + 10 * 60_000 })).toBe(false);
    expect(await verifyMatchResultSignature({ ...input, signature: null })).toBe(false);
    expect(await verifyMatchResultSignature({ ...input, timestamp: '1e12' })).toBe(false);
    expect(await signMatchResultRequest(SECRET, NOW, body)).toBe(headers[TOURNAMENT_RESULT_HEADERS.SIGNATURE]);
  });
});

describe('match progress pings', () => {
  it('parses a valid ping and maps it to the domain', () => {
    const parsed = parseMatchProgressReport(JSON.parse(JSON.stringify(progress())));
    expect(parsed).toEqual(progress());
    expect(toMatchProgress(parsed!)).toEqual({ matchId: MID, roomCode: ROOM, round: 3, maxRounds: 15, at: NOW });
  });

  it('rejects malformed pings', () => {
    expect(parseMatchProgressReport(null)).toBeNull();
    expect(parseMatchProgressReport({ ...progress(), v: 2 })).toBeNull();
    expect(parseMatchProgressReport({ ...progress(), kind: undefined })).toBeNull();
    expect(parseMatchProgressReport({ ...progress(), room: 't-otherroom2345' })).toBeNull();
    expect(parseMatchProgressReport({ ...progress(), tid: 'zzzzzzzzzz22' })).toBeNull();
    expect(parseMatchProgressReport({ ...progress(), gameId: 'has space' })).toBeNull();
    expect(parseMatchProgressReport({ ...progress(), round: 0 })).toBeNull();
    expect(parseMatchProgressReport({ ...progress(), round: 16 })).toBeNull();
    expect(parseMatchProgressReport({ ...progress(), round: 21, maxRounds: 21 })).toBeNull();
    expect(parseMatchProgressReport({ ...progress(), round: 1.5 })).toBeNull();
    expect(parseMatchProgressReport({ ...progress(), at: -1 })).toBeNull();
    expect(parseMatchProgressReport(report())).toBeNull();
  });

  it('tells results (no kind, as old workers send them) from pings and unknown kinds', () => {
    expect(matchReportKind(report())).toBe('result');
    expect(matchReportKind(progress())).toBe('progress');
    expect(matchReportKind({ ...report(), kind: 'telemetry' })).toBeNull();
    expect(matchReportKind(null)).toBe('result');
  });

  it('signs pings exactly like results', async () => {
    const { body, headers } = await buildMatchResultRequest(SECRET, progress(), NOW);
    const input = { secret: SECRET, signature: headers[TOURNAMENT_RESULT_HEADERS.SIGNATURE], timestamp: headers[TOURNAMENT_RESULT_HEADERS.TIMESTAMP], body, now: NOW };
    expect(await verifyMatchResultSignature(input)).toBe(true);
    expect(JSON.parse(body)).toEqual(progress());
  });
});

describe('result outcome', () => {
  it("reads the server's answer, counting a missing or unknown one as recorded (servers from before it)", () => {
    for (const outcome of ['recorded', 'duplicate', 'superseded', 'ignored'] as const) {
      expect(parseRecordResultOutcome({ outcome, tournamentStatus: 'running' })).toBe(outcome);
    }
    expect(parseRecordResultOutcome({ tournamentStatus: 'running' })).toBe('recorded');
    expect(parseRecordResultOutcome({ outcome: 'lost' })).toBe('recorded');
    expect(parseRecordResultOutcome(null)).toBe('recorded');
    expect(parseRecordResultOutcome('superseded')).toBe('recorded');
  });
});

describe('crypto ids', () => {
  it('produces valid, distinct ids', () => {
    const ids = new Set(Array.from({ length: 50 }, () => cryptoTournamentIds.tournamentId()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(/^[a-z2-9]{12}$/);
    expect(cryptoTournamentIds.inviteCode()).toMatch(/^[a-z2-9]{8}$/);
  });
});
