'use client';

import Link from 'next/link';
import { Globe } from 'lucide-react';

import { useAccount } from '@/presentation/providers/AccountProvider';

import { SERIF } from '../ui';
import { publicProfilePath } from './public-profile-links';

/** Small link to the player's own public profile page (/u/<username>). */
export function PublicProfileLink({ username, displayUsername, className = '' }: { username: string; displayUsername: string; className?: string }) {
  return (
    <Link
      href={publicProfilePath(username)}
      className={`inline-flex items-center gap-1.5 min-h-11 px-1 text-xs text-amber-300/75 hover:text-amber-100 underline-offset-4 hover:underline transition-colors ${className}`}
      style={SERIF}
    >
      <Globe className="w-3.5 h-3.5 shrink-0" aria-hidden />
      <span className="truncate">Public profile · @{displayUsername}</span>
    </Link>
  );
}

/** Link to the signed-in player's own public profile; renders nothing while it does not exist. */
export function OwnPublicProfileLink({ className = '' }: { className?: string }) {
  const { user, overview } = useAccount();
  if (!user || overview?.profile.isPublic === false) return null;
  return <PublicProfileLink username={user.username} displayUsername={user.displayUsername} className={className} />;
}
