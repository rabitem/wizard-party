import type { BetterAuthOptions } from 'better-auth';

/** Drops the cached public profile pages of these handles (old and new ones after a rename). */
export type InvalidatePublicProfiles = (usernames: readonly string[]) => void;

type UserHooks = NonNullable<NonNullable<BetterAuthOptions['databaseHooks']>['user']>;

function handlesOf(...values: unknown[]): string[] {
  const handles = values.filter((value): value is string => typeof value === 'string' && value.length > 0);
  return [...new Set(handles)];
}

/**
 * Auth-side writes that change what /u/<username> shows: renames, name/avatar edits and account
 * deletion all go straight to Better Auth (/update-user, /delete-user), never through the account
 * routes, so the public profile cache is purged from the user table's database hooks. A rename
 * purges the old handle too, so a released handle never keeps serving the previous owner's card.
 */
export function publicProfileCacheHooks(invalidate: InvalidatePublicProfiles): UserHooks {
  // Handle before the update, per request; the same context object reaches the after hook.
  const previousHandle = new WeakMap<object, string | null>();

  return {
    update: {
      before: async (data, context) => {
        if (!context || !('username' in data)) return;
        const userId = context.context.session?.user.id;
        if (!userId) return;
        const current = await context.context.internalAdapter.findUserById(userId);
        previousHandle.set(context, (current as { username?: string | null } | null)?.username ?? null);
      },
      after: async (user, context) => {
        const before = context ? previousHandle.get(context) : undefined;
        if (context) previousHandle.delete(context);
        const handles = handlesOf(before, (user as { username?: unknown } | null)?.username);
        if (handles.length > 0) invalidate(handles);
      },
    },
    delete: {
      after: async (user) => {
        const handles = handlesOf((user as { username?: unknown }).username);
        if (handles.length > 0) invalidate(handles);
      },
    },
  };
}
