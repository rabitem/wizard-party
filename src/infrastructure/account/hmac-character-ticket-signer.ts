import { AccountError } from '@shared/application/use-cases/account';
import type { CharacterTicketStatement, ICharacterTicketSigner } from '@shared/application/ports/account';
import { CHARACTER_TICKET, signCharacterTicket } from '@shared/realtime/character-ticket';

/**
 * Shared secret of the Next.js server and the game worker for character tickets. Read on every
 * use, so tests and rotations need no restart of the composition root.
 */
export function characterTicketSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  const secret = env.CHARACTER_TICKET_SECRET?.trim();
  return secret ? secret : null;
}

/** Signs character tickets with CHARACTER_TICKET_SECRET; the worker verifies them with the same codec. */
export class HmacCharacterTicketSigner implements ICharacterTicketSigner {
  constructor(private readonly secret: () => string | null = characterTicketSecret) {}

  async sign({ name, appearance, expiresAt }: CharacterTicketStatement): Promise<string> {
    const secret = this.secret();
    if (!secret) throw new AccountError('unavailable', 'Character tickets are not configured.');
    return signCharacterTicket(secret, { v: CHARACTER_TICKET.VERSION, name, appearance, exp: expiresAt });
  }
}
