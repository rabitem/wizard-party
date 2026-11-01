import { describe, expect, it } from 'vitest';

import {
  TOURNAMENT_RESULT_HEADERS,
  parseMatchProgressReport,
  signMatchTicket,
  verifyMatchResultSignature,
  type MatchProgressReport,
  type MatchResultReport,
} from '../../shared/tournament';
import { HttpMatchResultTransport } from './http-match-result-transport';
import { createTournamentMatchServices } from './tournament-match-services';
import { MemoryOutboxStorage } from '../test-support/memory-outbox-storage';
import { RecordingAlarm, TEST_MATCH_ID, TEST_NOW, TEST_ROOM, TEST_TOURNAMENT_ID, ticketClaims } from './tournament-test-support';

const SECRET = 'tournament-test-secret';
const RESULT_URL = 'https://app.test/api/tournaments/match-results';

const REPORT: MatchResultReport = {
  v: 1,
  tid: TEST_TOURNAMENT_ID,
  mid: TEST_MATCH_ID,
  room: TEST_ROOM,
  gameId: `${TEST_ROOM}:${TEST_NOW}`,
  completedAt: TEST_NOW,
  standings: [{ uid: 'user-a', placement: 1, score: 40, rounds: [{ bid: 1, tricksWon: 1, roundScore: 30 }], noShow: false, botTakeover: false }],
};

const PING: MatchProgressReport = {
  v: 1,
  kind: 'progress',
  tid: TEST_TOURNAMENT_ID,
  mid: TEST_MATCH_ID,
  room: TEST_ROOM,
  gameId: `${TEST_ROOM}:${TEST_NOW}`,
  round: 2,
  maxRounds: 10,
  at: TEST_NOW,
};

interface CapturedRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

function fakeFetch(respond: () => Response | Promise<Response>) {
  const requests: CapturedRequest[] = [];
  const fetch = (async (url: string, init: RequestInit) => {
    requests.push({ url, headers: init.headers as Record<string, string>, body: init.body as string });
    return respond();
  }) as unknown as typeof globalThis.fetch;
  return { fetch, requests };
}

function config(overrides: { secret?: string; resultUrl?: string; fetch?: typeof fetch } = {}) {
  return {
    storage: new MemoryOutboxStorage(),
    matchAlarm: new RecordingAlarm(),
    resultsAlarm: new RecordingAlarm(),
    resultUrl: RESULT_URL,
    ...overrides,
  };
}

function available(overrides: Parameters<typeof config>[0]) {
  const { services, outbox } = createTournamentMatchServices(config(overrides));
  if (!services.tickets || !outbox) throw new Error('tournaments should be available with a secret');
  return { tickets: services.tickets, results: services.results, outbox };
}

describe('createTournamentMatchServices', () => {
  it.each([
    ['no secret', { secret: undefined }],
    ['a blank secret', { secret: '   ' }],
    ['no result URL', { secret: SECRET, resultUrl: '' }],
  ])('should leave tournaments unavailable with %s', (_label, overrides) => {
    const { services, outbox } = createTournamentMatchServices(config(overrides));

    expect(services.tickets).toBeNull();
    expect(outbox).toBeNull();
  });

  it('should verify tickets the server signed with the shared secret', async () => {
    const { tickets } = available({ secret: SECRET });
    const claims = ticketClaims('user-a');
    const ticket = await signMatchTicket(SECRET, claims);
    const forged = await signMatchTicket('another-secret', claims);

    await expect(tickets.verify(ticket, claims.room, TEST_NOW)).resolves.toEqual({ ok: true, claims });
    await expect(tickets.verify(forged, claims.room, TEST_NOW)).resolves.toEqual({ ok: false, reason: 'bad_signature' });
    await expect(tickets.verify(ticket, 't-aaaaaaaaaaaaaa', TEST_NOW)).resolves.toEqual({ ok: false, reason: 'wrong_room' });
  });

  it('should trim the secret like the server does', async () => {
    const { tickets } = available({ secret: `  ${SECRET}
` });
    const claims = ticketClaims('user-a');
    await expect(tickets.verify(await signMatchTicket(SECRET, claims), claims.room, TEST_NOW)).resolves.toEqual({ ok: true, claims });
  });

  it('should post results to the configured URL', async () => {
    const posted = fakeFetch(() => new Response(null, { status: 204 }));
    const { results, outbox } = available({ secret: SECRET, fetch: posted.fetch });

    results.enqueue(REPORT);
    await outbox.flush();

    expect(posted.requests.map((request) => request.url)).toEqual([RESULT_URL]);
  });
});

describe('HttpMatchResultTransport', () => {
  it('should sign the report so the server can verify it', async () => {
    const { fetch, requests } = fakeFetch(() => new Response(null, { status: 200 }));
    const transport = new HttpMatchResultTransport({ url: RESULT_URL, secret: SECRET, fetch, now: () => TEST_NOW });

    await expect(transport.send(REPORT)).resolves.toEqual({ status: 'delivered', outcome: 'recorded' });

    const [request] = requests;
    expect(JSON.parse(request.body)).toEqual(REPORT);
    expect(request.headers['content-type']).toBe('application/json');
    await expect(verifyMatchResultSignature({
      secret: SECRET,
      signature: request.headers[TOURNAMENT_RESULT_HEADERS.SIGNATURE],
      timestamp: request.headers[TOURNAMENT_RESULT_HEADERS.TIMESTAMP],
      body: request.body,
      now: TEST_NOW,
    })).resolves.toBe(true);
  });

  it.each(['recorded', 'duplicate', 'superseded', 'ignored'] as const)("should read the server's outcome %s of a delivered result", async (outcome) => {
    const { fetch } = fakeFetch(() => Response.json({ outcome, tournamentStatus: 'running' }));
    const transport = new HttpMatchResultTransport({ url: RESULT_URL, secret: SECRET, fetch });

    await expect(transport.send(REPORT)).resolves.toEqual({ status: 'delivered', outcome });
  });

  it('should count a result as recorded when an older server answers no outcome', async () => {
    for (const respond of [() => new Response(null, { status: 204 }), () => new Response('ok'), () => Response.json({ outcome: 'later' })]) {
      const { fetch } = fakeFetch(respond);
      const transport = new HttpMatchResultTransport({ url: RESULT_URL, secret: SECRET, fetch });
      await expect(transport.send(REPORT)).resolves.toEqual({ status: 'delivered', outcome: 'recorded' });
    }
  });

  it('should sign progress pings like results', async () => {
    const { fetch, requests } = fakeFetch(() => Response.json({ outcome: 'recorded' }));
    const transport = new HttpMatchResultTransport({ url: RESULT_URL, secret: SECRET, fetch, now: () => TEST_NOW });

    await expect(transport.sendProgress(PING)).resolves.toEqual({ status: 'delivered' });

    const [request] = requests;
    expect(parseMatchProgressReport(JSON.parse(request.body))).toEqual(PING);
    await expect(verifyMatchResultSignature({
      secret: SECRET,
      signature: request.headers[TOURNAMENT_RESULT_HEADERS.SIGNATURE],
      timestamp: request.headers[TOURNAMENT_RESULT_HEADERS.TIMESTAMP],
      body: request.body,
      now: TEST_NOW,
    })).resolves.toBe(true);
  });

  it('should classify a refused progress ping as rejected (an app from before pings answers 4xx)', async () => {
    const { fetch } = fakeFetch(() => new Response('malformed', { status: 422 }));
    const transport = new HttpMatchResultTransport({ url: RESULT_URL, secret: SECRET, fetch });

    await expect(transport.sendProgress(PING)).resolves.toMatchObject({ status: 'rejected' });
  });

  it.each([
    [422, 'rejected'],
    [400, 'rejected'],
    [413, 'rejected'],
    [401, 'retry'],
    [429, 'retry'],
    [503, 'retry'],
  ])('should classify HTTP %i as %s', async (status, expected) => {
    const { fetch } = fakeFetch(() => new Response('nope', { status }));
    const transport = new HttpMatchResultTransport({ url: RESULT_URL, secret: SECRET, fetch });

    const result = await transport.send(REPORT);

    expect(result.status).toBe(expected);
    expect(result).toMatchObject({ reason: `HTTP ${status}: nope` });
  });

  it('should retry after network errors', async () => {
    const { fetch } = fakeFetch(() => Promise.reject(new Error('connection reset')));
    const transport = new HttpMatchResultTransport({ url: RESULT_URL, secret: SECRET, fetch });

    await expect(transport.send(REPORT)).resolves.toEqual({ status: 'retry', reason: 'connection reset' });
  });
});
