import type { BetterAuthOptions } from 'better-auth';
import { APIError } from 'better-auth/api';

import { USERNAME_RULES, canChangeUsername, deriveUsername, normalizeUsername, withUsernameSuffix } from '@shared/domain/account/username';

type UserHooks = NonNullable<NonNullable<BetterAuthOptions['databaseHooks']>['user']>;
type CreateBefore = NonNullable<NonNullable<UserHooks['create']>['before']>;
type UpdateBefore = NonNullable<NonNullable<UserHooks['update']>['before']>;
type HookContext = Parameters<CreateBefore>[1];
type NameFields = Record<string, unknown> & { username?: unknown; displayUsername?: unknown; name?: unknown };

/** Set on every rename (not on casing changes); null until the first one. Never client input. */
export const USERNAME_CHANGED_AT_FIELD = 'usernameChangedAt';

export const USERNAME_ERROR_CODES = {
  CHANGE_TOO_SOON: 'USERNAME_CHANGE_TOO_SOON',
  DISPLAY_MISMATCH: 'DISPLAY_USERNAME_MISMATCH',
} as const;

/** Attempts at a random suffix before giving up; collisions are already rare after the first. */
const MAX_GENERATION_ATTEMPTS = 20;

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const toTime = (value: unknown) => (value instanceof Date || typeof value === 'string' ? new Date(value).getTime() : null);

async function isTaken(context: HookContext, username: string): Promise<boolean> {
  if (!context) return false;
  const existing = await context.context.adapter.findOne({ model: 'user', where: [{ field: 'username', value: username }] });
  return existing !== null;
}

/** A free name for an account created without one (Google, GitHub or Discord sign-up). */
async function generateUsername(source: string, context: HookContext): Promise<string> {
  const derived = deriveUsername(source);
  const base = derived ?? USERNAME_RULES.GENERATED_FALLBACK;
  let candidate = derived ?? withUsernameSuffix(base);
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    if (!(await isTaken(context, normalizeUsername(candidate)))) return candidate;
    candidate = withUsernameSuffix(base);
  }
  throw new APIError('INTERNAL_SERVER_ERROR', { message: 'Could not pick a username. Please try again.' });
}

/** The casing must spell the stored name, so every view of the player shows the same name. */
function assertSpells(displayUsername: string, username: string): void {
  if (normalizeUsername(displayUsername) !== username) {
    throw new APIError('BAD_REQUEST', { message: 'The display casing must spell the username.', code: USERNAME_ERROR_CODES.DISPLAY_MISMATCH });
  }
}

/**
 * The username is the account's only name: used to sign in, shown at the table and to friends,
 * searched and used in /u/<username>. These hooks keep that invariant on the user table:
 * - every new account gets one (provider sign-ups a generated one, renamable right away),
 * - `name` (required by Better Auth) always mirrors it, so no second name can drift apart,
 * - a rename is allowed once every USERNAME_RULES.CHANGE_COOLDOWN_MS; casing edits are free.
 * Runs after the username plugin's hooks, which validate the name and its availability.
 */
export function usernameHooks(now: () => number = Date.now): { create: { before: CreateBefore }; update: { before: UpdateBefore } } {
  return {
    create: {
      before: async (user, context) => {
        const fields = user as NameFields;
        const username = text(fields.username) ? normalizeUsername(text(fields.username)) : null;
        const displayUsername = username ? text(fields.displayUsername) || username : await generateUsername(text(fields.name), context);
        const normalized = username ?? normalizeUsername(displayUsername);
        assertSpells(displayUsername, normalized);
        return { data: { ...user, username: normalized, displayUsername, name: displayUsername } };
      },
    },
    update: {
      before: async (data, context) => {
        const fields = data as NameFields;
        if (fields.username === undefined && fields.displayUsername === undefined && fields.name === undefined) return;
        // Name edits only come from /update-user with a session; internal updates never touch them.
        const userId = context?.context.session?.user.id;
        if (!userId) return;
        const current = (await context.context.internalAdapter.findUserById(userId)) as NameFields | null;
        if (!current) return;

        const currentUsername = text(current.username);
        const username = text(fields.username) ? normalizeUsername(text(fields.username)) : currentUsername;
        const renamed = username !== currentUsername;
        const displayUsername = text(fields.displayUsername) || (renamed ? username : text(current.displayUsername) || username);
        assertSpells(displayUsername, username);
        if (renamed && !canChangeUsername(toTime(current[USERNAME_CHANGED_AT_FIELD]), now())) {
          throw new APIError('BAD_REQUEST', {
            message: `You can change your username once every ${USERNAME_RULES.CHANGE_COOLDOWN_MS / 86_400_000} days.`,
            code: USERNAME_ERROR_CODES.CHANGE_TOO_SOON,
          });
        }
        return {
          data: { username, displayUsername, name: displayUsername, ...(renamed && { [USERNAME_CHANGED_AT_FIELD]: new Date(now()) }) },
        };
      },
    },
  };
}
