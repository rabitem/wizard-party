import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import type { PublicProfile } from '@shared/domain/account/public-profile';

import { PublicProfileView } from '@/presentation/components/account/public/PublicProfileView';
import { publicProfilePath, publicProfileUrl, resolveProfileHandle } from '@/presentation/components/account/public/public-profile-links';

import { loadProfile } from './load-profile';

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
    // The images are opengraph-image.tsx and twitter-image.tsx: the player's character, name and level.
    twitter: { card: 'summary_large_image', title: name, description },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const profile = await profileForParams(params);
  if (!profile) notFound();
  return <PublicProfileView profile={profile} />;
}
