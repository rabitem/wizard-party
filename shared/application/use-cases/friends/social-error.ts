export type SocialErrorCode = 'invalid_input' | 'not_found' | 'forbidden' | 'conflict' | 'limit_reached' | 'rate_limited';

/** Expected failures of social use cases; adapters map the code to a transport status. */
export class SocialError extends Error {
  constructor(
    readonly code: SocialErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'SocialError';
  }
}

export const RATE_LIMITED_MESSAGE = "You're doing that too often. Take a breather and try again in a moment.";

export function requireUserId(value: unknown, field = 'userId'): string {
  // Better Auth ids are opaque strings; bound the length so nothing huge reaches the database.
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) {
    throw new SocialError('invalid_input', `${field} must be a player id`);
  }
  return value;
}
