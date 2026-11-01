'use client';

import { Users } from 'lucide-react';

import { useRoomOccupancy } from '@/presentation/hooks/social/useRoomOccupancy';

/** "3/6" next to an invite, kept current while the invite can still be accepted. */
export function InviteRoomOccupancy({ roomCode }: { roomCode: string }) {
  const occupancy = useRoomOccupancy(roomCode);
  if (!occupancy) return null;
  const { playerCount, maxPlayers, inGame } = occupancy;
  const full = playerCount >= maxPlayers;
  const label = `${playerCount}/${maxPlayers} players${full ? ', full' : ''}${inGame ? ', game running' : ''}`;
  return (
    <span className={`inline-flex items-center gap-1 tabular-nums ${full ? 'text-red-300/80' : 'text-amber-300/80'}`} aria-label={label} title={label}>
      <Users className="w-3 h-3" aria-hidden />
      {playerCount}/{maxPlayers}
      {full ? ' · full' : inGame ? ' · in game' : ''}
    </span>
  );
}
