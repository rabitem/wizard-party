'use client';

import { useEffect, useState } from 'react';

import type { PlayerSearchResult } from '@shared/domain/social';

import { socialApi } from '@/lib/social/social-api';
import { useSocial } from '@/presentation/providers/SocialProvider';

import { RelationshipButton } from './RelationshipButton';

/** "Add friend" on a public profile page; nothing for guests or the player's own profile. */
export function ProfileFriendAction({ username }: { username: string }) {
  const { enabled } = useSocial();
  const [player, setPlayer] = useState<PlayerSearchResult | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    socialApi.player(username).then(
      (result) => !cancelled && setPlayer(result.player),
      () => undefined
    );
    return () => {
      cancelled = true;
    };
  }, [enabled, username]);

  if (!enabled || !player || player.relationship === 'self' || player.relationship === 'blocked') return null;
  return <RelationshipButton player={player} relationship={player.relationship} />;
}
