import { TournamentError, isTournamentError, type TournamentErrorCode } from '@shared/domain/tournament';

import { readBoundedBody } from '@/app/api/telemetry/client/read-bounded-body';

/** HTTP status per TournamentError code (docs/accounts/tournaments.md#http-api). */
const TOURNAMENT_ERROR_STATUS: Record<TournamentErrorCode, number> = {
  invalid_input: 422,
  not_found: 404,
  forbidden: 403,
  invalid_state: 409,
  full: 409,
  already_registered: 409,
  not_registered: 409,
  too_few_entrants: 409,
  conflict: 409,
  rate_limited: 429,
  unavailable: 503,
};

export const TOURNAMENTS_UNAVAILABLE_MESSAGE = 'Tournaments are not available right now.';

/** Viewer-aware answers (detail with `viewer`, "my tournaments") must never be cached publicly. */
export const PRIVATE_NO_STORE = 'private, no-store';

export function problem(status: number, code: string, message: string, headers: HeadersInit = { 'Cache-Control': 'no-store' }): Response {
  return Response.json({ error: { code, message } }, { status, headers });
}

/** The error body of a TournamentError, or null for anything else (the caller decides). */
export function tournamentProblem(error: unknown): Response | null {
  if (!isTournamentError(error)) return null;
  return problem(TOURNAMENT_ERROR_STATUS[error.code], error.code, error.message);
}

/** GET reads stay open while tournaments are unavailable; everything else is a mutation. */
export function isMutation(method: string): boolean {
  return method !== 'GET' && method !== 'HEAD';
}

/** Query parameters of the public list, passed through as the use case's untyped input. */
export function listQueryOf(url: string): { status?: string; cursor?: string; limit?: string } {
  const params = new URL(url).searchParams;
  const read = (key: string) => params.get(key) ?? undefined;
  return { status: read('status'), cursor: read('cursor'), limit: read('limit') };
}

/** The `?code=` of a private tournament link (validated by the use case). */
export function inviteCodeOf(url: string): string | undefined {
  return new URL(url).searchParams.get('code') ?? undefined;
}

export interface ReadJsonOptions {
  maxBytes: number;
  /** An empty body counts as `{}` (actions whose fields are all optional, e.g. registration). */
  optional?: boolean;
}

/**
 * The request's JSON object, read without buffering more than `maxBytes`. Anything else is an
 * `invalid_input` TournamentError (422), so handlers stay one-liners over the use case.
 */
export async function readJsonObject(req: Request, { maxBytes, optional = false }: ReadJsonOptions): Promise<Record<string, unknown>> {
  const text = await readBoundedBody(req, maxBytes);
  if (text === null) throw new TournamentError('invalid_input', 'The request is too large.');
  if (optional && text.trim() === '') return {};
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch {
    // fall through
  }
  throw new TournamentError('invalid_input', 'Expected a JSON object.');
}
