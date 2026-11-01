import { verifyMatchTicket, type MatchTicketVerification } from '../../shared/tournament';

/** Port: checks a match ticket presented in a room. */
export interface MatchTicketVerifier {
  verify(ticket: unknown, roomCode: string, now: number): Promise<MatchTicketVerification>;
}

/** HMAC-SHA256 tickets signed by the Next.js server with the shared TOURNAMENT_SECRET. */
export class HmacMatchTicketVerifier implements MatchTicketVerifier {
  constructor(private readonly secret: string) {}

  verify(ticket: unknown, roomCode: string, now: number): Promise<MatchTicketVerification> {
    return verifyMatchTicket({ secret: this.secret, ticket, roomCode, now });
  }
}
