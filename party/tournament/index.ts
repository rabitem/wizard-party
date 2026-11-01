// Tournament match mode of the game worker (docs/accounts/tournaments.md, "Game worker: match mode").
export { TournamentMatchController, type JoinAdmission, type MatchJoinOptions } from './tournament-match-controller';
export {
  TOURNAMENTS_UNAVAILABLE,
  createTournamentMatchServices,
  type TournamentMatchServices,
  type TournamentWorkerConfig,
  type TournamentWorkerServices,
} from './tournament-match-services';
export { HmacMatchTicketVerifier, type MatchTicketVerifier } from './match-ticket-verifier';
export {
  MatchResultOutbox,
  type DeliveredMatchResult,
  type MatchResultOutcomeListener,
  type MatchResultSink,
  type MatchResultOutboxOptions,
} from './match-result-outbox';
export {
  HttpMatchResultTransport,
  type HttpMatchResultTransportOptions,
  type MatchResultDelivery,
  type MatchResultTransport,
} from './http-match-result-transport';
export { buildMatchResultReport, buildForfeitReport, buildMatchProgressReport, matchGameId } from './match-result-builder';
export { lockedCommandError } from './match-command-gate';
export { toMatchRoomState, tournamentRoomInfo, tournamentMatchPayload, type TournamentRoomInfo } from './match-room-view';
export { reconcileMatchRecord, matchDeadlines, nextMatchDeadline, isSeatOccupied, type MatchDeadlines } from './match-schedule';
export {
  lockMatchRecord,
  parseMatchRecord,
  noShowDeadline,
  matchDeadline,
  isPastDeadline,
  type MatchSeatRecord,
  type TournamentMatchRecord,
} from './match-record';
export { TOURNAMENT_MATCH_STORAGE_KEY, TOURNAMENT_ROOM_LIMITS, TOURNAMENT_ROOM_TIMING, MATCH_RESULT_OUTBOX } from './match-room.constants';
