'use client';

import { useSocial } from '@/presentation/providers/SocialProvider';

import { RelationshipButton } from './RelationshipButton';

/**
 * Drop-in "add friend" for a seat at the current table (lobby list, scoreboard, game end). Renders
 * nothing for guests, bots, the player themself and seats without a signed-in account.
 */
export function SeatFriendAction({ gamePlayerId, size = 'compact' }: { gamePlayerId: string; size?: 'icon' | 'compact' | 'regular' }) {
  const { enabled, roomAccounts } = useSocial();
  const seat = enabled ? roomAccounts.get(gamePlayerId) : undefined;
  if (!seat || seat.relationship === 'blocked') return null;
  return <RelationshipButton player={seat.player} relationship={seat.relationship} size={size} />;
}
