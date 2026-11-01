import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { notFound, permanentRedirect } from 'next/navigation';
import { cache } from 'react';

import type { PublicProfile } from '@shared/domain/account/public-profile';

import { getAccountServices } from '@/infrastructure/account/account-container';
import { PUBLIC_PROFILE_REVALIDATE_SECONDS, publicProfileCacheTag } from '@/infrastructure/account/public-profile-cache';
import { isDatabaseConfigured } from '@/infrastructure/db/neon';
import { PublicProfileView } from '@/presentation/components/account/public/PublicProfileView';
import { publicProfilePath, publicProfileUrl, resolveProfileHandle } from '@/presentation/components/account/public/public-profile-links';

export const runtime = 'nodejs';
/**
 * Rendered on first visit, then served from cache and refreshed at most once a minute
 * (PUBLIC_PROFILE_REVALIDATE_SECONDS; segment config has to be a literal).
 */
export const revalidate = 60;
export const dynamicParams = true;

type Props = {
  params: Promise<{ username: string }>;
};

/** No profile is prerendered at build time; each is generated on its first request. */
export function generateStaticParams(): { username: string }[] {
  return [];
}

/**
 * Profile data of one canonical handle, tagged so account and auth writes can purge every cached
 * page built from it (revalidatePublicProfiles). Shared by generateMetadata and the page, so one
 * request hits the database once.
 */
const loadProfile = cache(async (username: string): Promise<PublicProfile | null> => {
  if (!isDatabaseConfigured()) return null;
  return unstable_cache(() => getAccountServices().getPublicProfile.execute(username), ['public-profile', username], {
    tags: [publicProfileCacheTag(username)],
    revalidate: PUBLIC_PROFILE_REVALIDATE_SECONDS,
  })();
});

/** The profile behind the canonical URL; any other spelling of the handle redirects there. */
async function profileForParams(params: Props['params']): Promise<PublicProfile | null> {
  const handle = resolveProfileHandle((await params).username);
  if (handle.kind === 'not-found') return null;
  if (handle.kind === 'redirect') permanentRedirect(publicProfilePath(handle.username));
  return loadProfile(handle.username);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await profileForParams(params);
  if (!profile) {
    return { title: 'Wizard not found', robots: { index: false, follow: true } };
  }
  const { level, title } = profile.progression;
  const name = profile.displayName;
  const description = `Level ${level} ${title} on Wizard Party · ${profile.stats.gamesPlayed} games played, ${profile.stats.gamesWon} won.${profile.tagline ? ` “${profile.tagline}”` : ''}`;
  const url = publicProfileUrl(profile.username);
  return {
    title: name,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: { type: 'profile', title: name, description, url, username: profile.displayName },
    twitter: { card: 'summary', title: name, description },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const profile = await profileForParams(params);
  if (!profile) notFound();
  return <PublicProfileView profile={profile} />;
}
