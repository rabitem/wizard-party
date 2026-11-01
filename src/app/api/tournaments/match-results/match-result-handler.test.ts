import { describe, expect, it, vi } from 'vitest';

import { TournamentError } from '@shared/domain/tournament';
import type { RecordMatchProgressOutput, RecordMatchResultOutput } from '@shared/application/use-cases/tournament';
import {
  TOURNAMENT_RESULT_HEADERS,
  TOURNAMENT_WIRE_LIMITS,
  buildMatchResultRequest,
  signMatchResultRequest,
  type MatchProgressReport,
  type MatchResultReport,
} from '@shared/tournament';

import { handleMatchResultRequest, type MatchResultHandlerDeps } from './match-result-handler';

const NOW = 1_800_000_000_000;
const SECRET = 'test-tournament-secret';
const ENDPOINT = 'https://wizardparty.fun/api/tournaments/match-results';

/** The handler only authenticates and transports; the body's validity is the use case's business. */
const REPORT = { v: 1, tid: 'abcdefghjk12', mid: 'abcdefghjk12-1-1', gameId: 'game-1', standings: [] } as unknown as MatchResultReport;
const PING = { v: 1, kind: 'progress', tid: 'abcdefghjk12', mid: 'abcdefghjk12-1-1', gameId: 'game-1', round: 2, maxRounds: 20, at: NOW } as unknown as MatchProgressReport;

function setup(overrides: Partial<MatchResultHandlerDeps> = {}) {
  const execute = vi.fn(async (_body: unknown): Promise<RecordMatchResultOutput> => ({ outcome: 'recorded', tournamentStatus: 'running' }));
  const progress = vi.fn(async (_body: unknown): Promise<RecordMatchProgressOutput> => ({ outcome: 'recorded' }));
  const log = vi.fn();
  const deps: MatchResultHandlerDeps = { secret: () => SECRET, record: { execute }, progress: { execute: progress }, log, now: () => NOW, ...overrides };
  return { execute, progress, log, handle: (req: Request) => handleMatchResultRequest(req, deps) };
}

interface SignedRequestOptions {
  /** Replaces the report with any (signed) text. */
  body?: string;
  report?: MatchResultReport | MatchProgressReport;
  signedAt?: number;
  secret?: string;
}

/** A request exactly as the worker sends it. */
async function signedRequest({ body, report = REPORT, signedAt = NOW, secret = SECRET }: SignedRequestOptions = {}): Promise<Request> {
  const request = await buildMatchResultRequest(secret, report, signedAt);
  if (body !== undefined) request.headers[TOURNAMENT_RESULT_HEADERS.SIGNATURE] = await signMatchResultRequest(secret, signedAt, body);
  return new Request(ENDPOINT, { method: 'POST', headers: request.headers, body: body ?? request.body });
}

async function errorCode(response: Response): Promise<string> {
  return ((await response.json()) as { error: { code: string } }).error.code;
}

describe('handleMatchResultRequest', () => {
  it('should record a correctly signed report without kind (pre-progress workers) and answer the outcome', async () => {
    const { handle, execute, progress } = setup();
    const response = await handle(await signedRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ outcome: 'recorded', tournamentStatus: 'running' });
    expect(execute).toHaveBeenCalledWith(REPORT);
    expect(progress).not.toHaveBeenCalled();
  });

  it('should hand progress pings to the progress use case and answer its outcome', async () => {
    const { handle, execute, progress, log } = setup();
    const response = await handle(await signedRequest({ report: PING }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ outcome: 'recorded' });
    expect(progress).toHaveBeenCalledWith(PING);
    expect(execute).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('info', 'tournament_progress_recorded', expect.objectContaining({ outcome: 'recorded' }));
  });

  it('should answer 400 (never retried) for a kind it does not know', async () => {
    const { handle, execute, progress } = setup();
    const response = await handle(await signedRequest({ body: JSON.stringify({ ...REPORT, kind: 'telemetry' }) }));
    expect(response.status).toBe(400);
    expect(await errorCode(response)).toBe('unknown_kind');
    expect(execute).not.toHaveBeenCalled();
    expect(progress).not.toHaveBeenCalled();
  });

  it('should answer 422 for a malformed progress ping like for a malformed result', async () => {
    const { handle } = setup({ progress: { execute: async () => Promise.reject(new TournamentError('invalid_input', 'Malformed match progress.')) } });
    const response = await handle(await signedRequest({ report: PING }));
    expect(response.status).toBe(422);
  });

  it('should answer 200 for duplicates, so the worker stops redelivering', async () => {
    const { handle } = setup({ record: { execute: async () => ({ outcome: 'duplicate', tournamentStatus: 'completed' }) } });
    const response = await handle(await signedRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ outcome: 'duplicate', tournamentStatus: 'completed' });
  });

  it('should log a result that lost to a voided table as superseded, not as a re-delivery', async () => {
    const { handle, log } = setup({ record: { execute: async () => ({ outcome: 'superseded', tournamentStatus: 'running' }) } });
    const response = await handle(await signedRequest());
    expect(response.status).toBe(200);
    expect(log).toHaveBeenCalledWith('warn', 'tournament_result_superseded', expect.objectContaining({ outcome: 'superseded' }));
  });

  it('should answer 503 (retry) without TOURNAMENT_SECRET and record nothing', async () => {
    const { handle, execute } = setup({ secret: () => null });
    const response = await handle(await signedRequest());
    expect(response.status).toBe(503);
    expect(execute).not.toHaveBeenCalled();
  });

  it('should answer 413 for a body over the limit', async () => {
    const { handle, execute } = setup();
    const body = 'x'.repeat(TOURNAMENT_WIRE_LIMITS.MAX_RESULT_BODY_BYTES + 1);
    const response = await handle(await signedRequest({ body }));
    expect(response.status).toBe(413);
    expect(execute).not.toHaveBeenCalled();
  });

  it('should answer 401 for a signature made with another secret', async () => {
    const { handle, execute } = setup();
    const response = await handle(await signedRequest({ secret: 'someone-else' }));
    expect(response.status).toBe(401);
    expect(execute).not.toHaveBeenCalled();
  });

  it('should answer 401 for a stale timestamp (replay window)', async () => {
    const { handle } = setup();
    const response = await handle(await signedRequest({ signedAt: NOW - TOURNAMENT_WIRE_LIMITS.SIGNATURE_TOLERANCE_MS - 1 }));
    expect(response.status).toBe(401);
  });

  it('should answer 401 for a body changed after signing', async () => {
    const { handle } = setup();
    const signed = await signedRequest();
    const tampered = new Request(ENDPOINT, { method: 'POST', headers: signed.headers, body: JSON.stringify({ ...REPORT, gameId: 'other' }) });
    expect((await handle(tampered)).status).toBe(401);
  });

  it('should answer 401 without signature headers', async () => {
    const { handle } = setup();
    const response = await handle(new Request(ENDPOINT, { method: 'POST', body: JSON.stringify(REPORT) }));
    expect(response.status).toBe(401);
  });

  it('should answer 400 for a signed body that is not JSON', async () => {
    const { handle, execute } = setup();
    const response = await handle(await signedRequest({ body: 'not json' }));
    expect(response.status).toBe(400);
    expect(execute).not.toHaveBeenCalled();
  });

  it.each(['invalid_input', 'not_found'] as const)('should answer 422 (dead letter) for %s', async (code) => {
    const { handle } = setup({ record: { execute: async () => Promise.reject(new TournamentError(code, 'nope')) } });
    const response = await handle(await signedRequest());
    expect(response.status).toBe(422);
    expect(await errorCode(response)).toBe(code);
  });

  it('should answer 409 (retry) when the tournament stayed busy', async () => {
    const { handle } = setup({ record: { execute: async () => Promise.reject(new TournamentError('conflict', 'busy')) } });
    expect((await handle(await signedRequest())).status).toBe(409);
  });

  it('should answer 503 (retry) and log when storage fails', async () => {
    const { handle, log } = setup({ record: { execute: async () => Promise.reject(new Error('database down')) } });
    const response = await handle(await signedRequest());
    expect(response.status).toBe(503);
    expect(log).toHaveBeenCalledWith('error', 'tournament_result_failed', expect.objectContaining({ error: 'database down' }));
  });
});
