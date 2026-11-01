import { TournamentError } from '@shared/domain/tournament';
import type { ITournamentTicketSigner } from '@shared/application/ports/tournament';
import { signMatchTicket, type MatchTicketClaims } from '@shared/tournament';

/**
 * Signs match tickets with the shared TOURNAMENT_SECRET (the game worker verifies them with the
 * same codec). The secret is looked up per ticket; without it tournaments are unavailable.
 */
export class HmacTournamentTicketSigner implements ITournamentTicketSigner {
  constructor(private readonly secret: () => string | null) {}

  async sign(claims: MatchTicketClaims): Promise<string> {
    const secret = this.secret();
    if (!secret) throw new TournamentError('unavailable', 'Tournaments are not available right now.');
    return signMatchTicket(secret, claims);
  }
}
