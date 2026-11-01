import { TOURNAMENT_ID_LENGTH, TOURNAMENT_INVITE_CODE_LENGTH, randomIdFrom } from '../domain/tournament/tournament-ids';

/** Random ids for new tournaments, from the platform CSPRNG (Workers, Node 19+, browsers). */
export interface TournamentIdSource {
  tournamentId(): string;
  inviteCode(): string;
}

function cryptoBytes(count: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(count));
}

export const cryptoTournamentIds: TournamentIdSource = {
  tournamentId: () => randomIdFrom(cryptoBytes, TOURNAMENT_ID_LENGTH),
  inviteCode: () => randomIdFrom(cryptoBytes, TOURNAMENT_INVITE_CODE_LENGTH),
};
