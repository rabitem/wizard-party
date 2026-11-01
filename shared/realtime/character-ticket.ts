import { parseAppearance, validateAppearance, type CharacterAppearance } from '../domain/character';
import { PlayerNameService } from '../domain/services/player-name.service';
import { base64UrlToBytes, base64UrlToText, bytesToBase64Url, textToBase64Url } from '../tournament/base64url';
import { hmacSign, hmacVerify } from '../tournament/hmac';

/*
 * Character tickets: the server's signed statement "the account named <name> looks like
 * <appearance> until <exp>". The browser sends one with JOIN_GAME; the worker verifies it with the
 * shared CHARACTER_TICKET_SECRET and shows the look on the seat that joins under that name. Looks
 * are public, so the ticket is no secret: the name binding only stops a seat from wearing another
 * player's look.
 */

export const CHARACTER_TICKET = {
  VERSION: 1,
  PREFIX: 'c1',
  /** Domain separation from every other HMAC the app signs. */
  SIGNING_CONTEXT: 'character-ticket.v1.',
  /** A look and a name encode to well under 1 KiB. */
  MAX_LENGTH: 2048,
  /** Long enough to cover a long evening of rejoins; a saved look gets a fresh ticket anyway. */
  TTL_MS: 12 * 60 * 60 * 1000,
} as const;

export interface CharacterTicketClaims {
  v: typeof CHARACTER_TICKET.VERSION;
  /** The account's username: the name its seat joins under. */
  name: string;
  appearance: CharacterAppearance;
  /** Expiry, epoch ms. */
  exp: number;
}

export type CharacterTicketVerification =
  | { ok: true; claims: CharacterTicketClaims }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'invalid_claims' | 'expired' };

/** Decoded claims, structurally checked: a known version, a name, a valid look and an expiry. */
export function parseCharacterTicketClaims(value: unknown): CharacterTicketClaims | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (raw.v !== CHARACTER_TICKET.VERSION || typeof raw.name !== 'string' || raw.name.length === 0) return null;
  if (typeof raw.exp !== 'number' || !Number.isSafeInteger(raw.exp) || raw.exp < 0) return null;
  const appearance = parseAppearance(raw.appearance);
  if (!appearance || validateAppearance(appearance) !== null) return null;
  return { v: CHARACTER_TICKET.VERSION, name: raw.name, appearance, exp: raw.exp };
}

export async function signCharacterTicket(secret: string, claims: CharacterTicketClaims): Promise<string> {
  const signed = `${CHARACTER_TICKET.PREFIX}.${textToBase64Url(JSON.stringify(claims))}`;
  const signature = await hmacSign(secret, `${CHARACTER_TICKET.SIGNING_CONTEXT}${signed}`);
  return `${signed}.${bytesToBase64Url(signature)}`;
}

/** Signature first (nothing unauthenticated is parsed further), then claims and expiry. */
export async function verifyCharacterTicket(secret: string, ticket: unknown, now: number): Promise<CharacterTicketVerification> {
  if (typeof ticket !== 'string' || ticket.length > CHARACTER_TICKET.MAX_LENGTH) return { ok: false, reason: 'malformed' };
  const parts = ticket.split('.');
  if (parts.length !== 3 || parts[0] !== CHARACTER_TICKET.PREFIX) return { ok: false, reason: 'malformed' };
  const signature = base64UrlToBytes(parts[2]);
  if (!signature) return { ok: false, reason: 'malformed' };
  if (!(await hmacVerify(secret, `${CHARACTER_TICKET.SIGNING_CONTEXT}${parts[0]}.${parts[1]}`, signature))) {
    return { ok: false, reason: 'bad_signature' };
  }

  const json = base64UrlToText(parts[1]);
  let decoded: unknown;
  try {
    decoded = json === null ? null : JSON.parse(json);
  } catch {
    decoded = null;
  }
  const claims = parseCharacterTicketClaims(decoded);
  if (!claims) return { ok: false, reason: 'invalid_claims' };
  if (claims.exp <= now) return { ok: false, reason: 'expired' };
  return { ok: true, claims };
}

/** The look a ticket grants a seat joining under `seatName`; null when it names someone else. */
export function ticketLookForSeat(claims: CharacterTicketClaims, seatName: string): CharacterAppearance | null {
  return PlayerNameService.normalize(claims.name) === PlayerNameService.normalize(seatName) ? claims.appearance : null;
}
