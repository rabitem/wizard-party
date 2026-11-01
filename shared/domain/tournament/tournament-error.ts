export const TOURNAMENT_ERROR_CODES = [
  'not_found',
  'forbidden',
  'invalid_input',
  'invalid_state',
  'full',
  'already_registered',
  'not_registered',
  'too_few_entrants',
  'conflict',
  'rate_limited',
  'unavailable',
] as const;

export type TournamentErrorCode = (typeof TOURNAMENT_ERROR_CODES)[number];

/**
 * Expected failures of tournament rules and use cases. Messages are written for players; adapters
 * map the code to a transport status (see docs/accounts/tournaments.md).
 */
export class TournamentError extends Error {
  constructor(
    readonly code: TournamentErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'TournamentError';
  }
}

export function isTournamentError(error: unknown, code?: TournamentErrorCode): error is TournamentError {
  return error instanceof TournamentError && (code === undefined || error.code === code);
}
