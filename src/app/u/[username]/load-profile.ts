import 'server-only';

import { unstable_cache } from 'next/cache';
import { cache } from 'react';

import type { PublicProfile } from '@shared/domain/account/public-profile';

import { getAccountServices } from '@/infrastructure/account/account-container';
import { PUBLIC_PROFILE_REVALIDATE_SECONDS, publicProfileCacheTag } from '@/infrastructure/account/public-profile-cache';
import { isDatabaseConfigured } from '@/infrastructure/db/neon';

/**
 * Profile data of one canonical handle, tagged so account and auth writes can purge every cached
 * page and link preview built from it (revalidatePublicProfiles). Shared by generateMetadata, the
 * page and its Open Graph image, so one request hits the database once.
 */
export const loadProfile = cache(async (username: string): Promise<PublicProfile | null> => {
  if (!isDatabaseConfigured()) return null;
  return unstable_cache(() => getAccountServices().getPublicProfile.execute(username), ['public-profile', username], {
    tags: [publicProfileCacheTag(username)],
    revalidate: PUBLIC_PROFILE_REVALIDATE_SECONDS,
  })();
});
