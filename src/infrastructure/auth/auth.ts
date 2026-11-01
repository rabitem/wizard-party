import 'server-only';

import { betterAuth } from 'better-auth';
import { headers } from 'next/headers';

import { getRedis } from '@/lib/redis';

import { getAccountServices } from '../account/account-container';
import { revalidatePublicProfiles } from '../account/public-profile-cache';
import { getPgPool } from '../db/pg-pool';
import { getEmailSender } from '../email/email-sender';
import { getTournamentServices } from '../tournament/tournament-container';
import type { AuthCapabilities } from './auth-capabilities';
import { buildAuthOptions } from './auth-options';
import { enabledProviderIds } from './social-providers';
import { createUpstashRateLimitStorage } from './upstash-rate-limit-storage';

function createAuth() {
  const redis = getRedis();
  return betterAuth(
    buildAuthOptions({
      database: getPgPool(),
      email: getEmailSender(),
      rateLimitStorage: redis ? createUpstashRateLimitStorage(redis) : undefined,
      purgeExternalData: async (userId) => {
        // Hosted tournaments still in registration are cancelled and the host's name is removed
        // from all of them; entries, results and awards then go with the account row (cascade).
        await getTournamentServices().purgeData.execute(userId);
        await getAccountServices().purgeAccountStorage.execute(userId);
      },
      invalidatePublicProfiles: revalidatePublicProfiles,
    })
  );
}

let instance: ReturnType<typeof createAuth> | null = null;

/** Lazily created so builds and routes that never touch auth need no database. */
export function getAuth() {
  instance ??= createAuth();
  return instance;
}

export interface SessionUser {
  id: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  /** The account's only name, lowercase: sign-in and /u/<username> (see username-hooks.ts). */
  username: string;
  /** The username in the casing the player chose; what other players see. */
  displayUsername: string;
  /** Last rename; null until the first one. */
  usernameChangedAt?: Date | null;
}

export async function getSessionUser(requestHeaders?: Headers): Promise<SessionUser | null> {
  const session = await getAuth().api.getSession({ headers: requestHeaders ?? (await headers()) });
  if (!session) return null;
  // Both columns are NOT NULL (db/migrations/0107_one_player_name.sql); the plugin types predate that.
  const { username, displayUsername } = session.user as typeof session.user & { username: string; displayUsername: string };
  return { ...session.user, username, displayUsername };
}

export function getAuthCapabilities(): AuthCapabilities {
  return { providers: enabledProviderIds(), email: getEmailSender().canDeliver, passkeys: true };
}
