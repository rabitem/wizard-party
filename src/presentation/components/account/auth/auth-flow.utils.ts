import { USERNAME_ERROR_MESSAGES, validateUsername } from '@shared/domain/account/username';

import { AUTH_FLOW_CONFIG } from './auth-flow.config';

export type SignInIdentifier = { kind: 'email'; email: string } | { kind: 'username'; username: string };

/** One field accepts both: anything with an @ is an email, everything else a username. */
export function parseSignInIdentifier(value: string): SignInIdentifier {
  const trimmed = value.trim();
  return trimmed.includes('@') ? { kind: 'email', email: trimmed } : { kind: 'username', username: trimmed };
}

/** Keeps only digits and cuts to the code length, so pasted codes like "123 456" work. */
export function sanitizeCode(value: string, length: number = AUTH_FLOW_CONFIG.CODE_LENGTH): string {
  return value.replace(/\D/g, '').slice(0, length);
}

export function isCompleteCode(value: string, length: number = AUTH_FLOW_CONFIG.CODE_LENGTH): boolean {
  return value.length === length && /^[0-9]+$/.test(value);
}

/** Whole seconds until another code may be requested; 0 when allowed now. */
export function cooldownSecondsLeft(sentAt: number | null, now: number, cooldownSeconds: number = AUTH_FLOW_CONFIG.RESEND_COOLDOWN_SECONDS): number {
  if (sentAt === null) return 0;
  const remainingMs = sentAt + cooldownSeconds * 1000 - now;
  return remainingMs <= 0 ? 0 : Math.ceil(remainingMs / 1000);
}

/** Inline message for a username before asking the server, or null when it looks valid. */
export function usernameProblem(value: string): string | null {
  const error = validateUsername(value);
  return error ? USERNAME_ERROR_MESSAGES[error] : null;
}

/** Shows "a***@example.com" style hints without revealing the full address on screen. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(1, Math.min(local.length - visible.length, 6)))}${email.slice(at)}`;
}

/** Only same-site paths are allowed as post-login targets (no open redirects). */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/';
}
