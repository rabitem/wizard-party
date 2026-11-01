import { GameError } from './game-errors';

/*
 * Errors of tournament match rooms on the game worker. The codes are part of the client contract
 * (docs/accounts/tournaments.md): the lobby shows a "back to the tournament" hint for them.
 */

export const TOURNAMENT_GAME_ERROR_CODES = {
  TICKET_REQUIRED: 'TOURNAMENT_TICKET_REQUIRED',
  TICKET_INVALID: 'TOURNAMENT_TICKET_INVALID',
  /** Final: the match started without this member (no-show); no ticket can seat them again. */
  NO_SHOW: 'TOURNAMENT_NO_SHOW',
  MATCH_LOCKED: 'TOURNAMENT_MATCH_LOCKED',
  UNAVAILABLE: 'TOURNAMENTS_UNAVAILABLE',
} as const;

/** A join without a ticket on a tournament room code (or a room locked to a match). */
export class TournamentTicketRequiredError extends GameError {
  constructor() {
    super('This table is reserved for a tournament match. Join it from the tournament page.', TOURNAMENT_GAME_ERROR_CODES.TICKET_REQUIRED);
    this.name = 'TournamentTicketRequiredError';
  }
}

/** The ticket is malformed, forged, expired, or for another room, match or seat. */
export class TournamentTicketInvalidError extends GameError {
  constructor(reason: string) {
    super(`Your tournament ticket is not valid (${reason}). Open the tournament page and join again.`, TOURNAMENT_GAME_ERROR_CODES.TICKET_INVALID);
    this.name = 'TournamentTicketInvalidError';
  }
}

/** The member did not arrive before the start: the match went on without them, for good. */
export class TournamentNoShowError extends GameError {
  constructor() {
    super('The match started without you, so your seat counts as a no-show.', TOURNAMENT_GAME_ERROR_CODES.NO_SHOW);
    this.name = 'TournamentNoShowError';
  }
}

/** Host-style commands (settings, bots, kick, start, rematch) are disabled in match rooms. */
export class TournamentMatchLockedError extends GameError {
  constructor(action: string) {
    super(`You can't ${action} in a tournament match.`, TOURNAMENT_GAME_ERROR_CODES.MATCH_LOCKED);
    this.name = 'TournamentMatchLockedError';
  }
}

/** The worker has no TOURNAMENT_SECRET, so it can verify no ticket. */
export class TournamentsUnavailableError extends GameError {
  constructor() {
    super('Tournaments are not available right now.', TOURNAMENT_GAME_ERROR_CODES.UNAVAILABLE);
    this.name = 'TournamentsUnavailableError';
  }
}
