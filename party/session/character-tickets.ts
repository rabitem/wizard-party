import type { CharacterAppearance } from '../../shared/domain/character';
import { ticketLookForSeat, verifyCharacterTicket, type CharacterTicketClaims } from '../../shared/realtime/character-ticket';

/** Port: checks a character ticket presented with JOIN_GAME. Never throws. */
export interface CharacterTicketVerifier {
  /** The ticket's claims when it is authentic and current; null otherwise. */
  verify(ticket: string, now: number): Promise<CharacterTicketClaims | null>;
}

/** HMAC-SHA256 tickets signed by the Next.js server with the shared CHARACTER_TICKET_SECRET. */
export class HmacCharacterTicketVerifier implements CharacterTicketVerifier {
  constructor(private readonly secret: string) {}

  async verify(ticket: string, now: number): Promise<CharacterTicketClaims | null> {
    try {
      const verification = await verifyCharacterTicket(this.secret, ticket, now);
      if (verification.ok) return verification.claims;
      // An expired ticket is routine (a long-open tab); anything else is worth a look.
      if (verification.reason !== 'expired') {
        console.warn(JSON.stringify({ level: 'warn', msg: 'character_ticket_rejected', reason: verification.reason }));
      }
    } catch (error) {
      console.error(JSON.stringify({ level: 'error', msg: 'character_ticket_verification_failed', error: String(error) }));
    }
    return null;
  }
}

/** Without CHARACTER_TICKET_SECRET no ticket can be verified: every seat stays a silhouette. */
export function createCharacterTicketVerifier(secret: string | undefined): CharacterTicketVerifier | null {
  return secret ? new HmacCharacterTicketVerifier(secret) : null;
}

/** The look verified claims grant a seat joining under `seatName`, if they name that seat. */
export function verifiedLook(claims: CharacterTicketClaims | null, seatName: string | undefined): CharacterAppearance | undefined {
  if (!claims || seatName === undefined) return undefined;
  return ticketLookForSeat(claims, seatName) ?? undefined;
}
