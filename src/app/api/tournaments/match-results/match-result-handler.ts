import { isTournamentError, type TournamentErrorCode } from '@shared/domain/tournament';
import type { RecordMatchProgressOutput, RecordMatchResultOutput } from '@shared/application/use-cases/tournament';
import { TOURNAMENT_RESULT_HEADERS, TOURNAMENT_WIRE_LIMITS, matchReportKind, verifyMatchResultSignature, type MatchReportKind } from '@shared/tournament';

import { readBoundedBody } from '@/app/api/telemetry/client/read-bounded-body';

type LogLevel = 'info' | 'warn' | 'error';

export interface MatchResultHandlerDeps {
  /** TOURNAMENT_SECRET, read per request; null = tournaments unavailable. */
  secret: () => string | null;
  record: { execute(body: unknown): Promise<RecordMatchResultOutput> };
  /** Progress pings (`kind: 'progress'`): proof that a table is being played. */
  progress: { execute(body: unknown): Promise<RecordMatchProgressOutput> };
  log: (level: LogLevel, msg: string, fields: Record<string, unknown>) => void;
  now: () => number;
}

/**
 * TournamentErrors the worker must not retry: the report can never be recorded (malformed, or the
 * tournament / match is gone). Everything else (conflict, unavailable, storage errors) is retried.
 */
const PERMANENT_ERRORS: ReadonlySet<TournamentErrorCode> = new Set(['invalid_input', 'not_found', 'forbidden', 'invalid_state']);

/** Retryable TournamentErrors keep their own status (409 conflict, 429, 503). */
const RETRY_STATUS: Partial<Record<TournamentErrorCode, number>> = { conflict: 409, rate_limited: 429 };
const RETRY_FALLBACK_STATUS = 503;

function problem(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status, headers: { 'Cache-Control': 'no-store' } });
}

function parseJson(body: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(body) };
  } catch {
    return { ok: false };
  }
}

interface RequestContext {
  requestId: string | null;
  startedAt: number;
}

/** Records the body by its kind and logs what happened; TournamentErrors propagate. */
async function dispatch(
  kind: MatchReportKind,
  body: unknown,
  deps: MatchResultHandlerDeps,
  { requestId, startedAt }: RequestContext
): Promise<RecordMatchResultOutput | RecordMatchProgressOutput> {
  if (kind === 'progress') {
    const result = await deps.progress.execute(body);
    deps.log('info', 'tournament_progress_recorded', { requestId, ...result, ms: deps.now() - startedAt });
    return result;
  }
  const result = await deps.record.execute(body);
  // A played result for a table that was voided first (deadline, host) is lost for good: never
  // let it pass as a silent re-delivery in the logs.
  const superseded = result.outcome === 'superseded';
  deps.log(superseded ? 'warn' : 'info', superseded ? 'tournament_result_superseded' : 'tournament_result_recorded', {
    requestId,
    ...result,
    ms: deps.now() - startedAt,
  });
  return result;
}

/**
 * Receives a finished tournament match, or a progress ping of a table in play, from the game worker
 * (docs/accounts/tournaments.md#match-result). Results carry no `kind`, pings `kind: 'progress'`; any other
 * kind is a 400. No session: the HMAC over `${timestamp}.${body}` with TOURNAMENT_SECRET is the
 * authentication.
 *
 * Status codes are the producer contract (like telemetry ingest): 2xx = recorded (also duplicate /
 * superseded / ignored), 400/413/422 = never retry (dead letter), anything else = retry with backoff.
 */
export async function handleMatchResultRequest(req: Request, deps: MatchResultHandlerDeps): Promise<Response> {
  const startedAt = deps.now();
  const requestId = req.headers.get('x-vercel-id');
  const secret = deps.secret();
  if (!secret) {
    deps.log('error', 'tournament_result_misconfigured', { requestId });
    return problem(503, 'unavailable', 'tournaments are not configured');
  }

  const body = await readBoundedBody(req, TOURNAMENT_WIRE_LIMITS.MAX_RESULT_BODY_BYTES);
  if (body === null) return problem(413, 'too_large', 'body too large');

  const authentic = await verifyMatchResultSignature({
    secret,
    signature: req.headers.get(TOURNAMENT_RESULT_HEADERS.SIGNATURE),
    timestamp: req.headers.get(TOURNAMENT_RESULT_HEADERS.TIMESTAMP),
    body,
    now: deps.now(),
  });
  if (!authentic) {
    deps.log('warn', 'tournament_result_unauthorized', { requestId });
    return problem(401, 'unauthorized', 'invalid signature');
  }

  const json = parseJson(body);
  if (!json.ok) return problem(400, 'invalid_json', 'invalid json');
  const kind = matchReportKind(json.value);
  if (!kind) return problem(400, 'unknown_kind', 'unknown report kind');

  try {
    const result = await dispatch(kind, json.value, deps, { requestId, startedAt });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (isTournamentError(error)) {
      const permanent = PERMANENT_ERRORS.has(error.code);
      deps.log(permanent ? 'warn' : 'error', 'tournament_result_rejected', { requestId, kind, code: error.code, error: error.message });
      return problem(permanent ? 422 : (RETRY_STATUS[error.code] ?? RETRY_FALLBACK_STATUS), error.code, error.message);
    }
    deps.log('error', 'tournament_result_failed', {
      requestId,
      kind,
      error: error instanceof Error ? error.message : String(error),
      ms: deps.now() - startedAt,
    });
    return problem(503, 'unavailable', 'storage unavailable');
  }
}
