'use client';

import { useEffect, useState } from 'react';

import { GamePhase } from '@shared/domain';
import { buildPartyRoomUrl } from '@shared/realtime/realtime-host';

import { getDefaultHost } from '@/presentation/components/room-browser/utils';

/** How often a visible invite looks at its room again, so joins and leaves show up live. */
const POLL_MS = 5_000;

export interface RoomOccupancy {
  playerCount: number;
  maxPlayers: number;
  /** A game is running there, so joining means spectating or waiting. */
  inGame: boolean;
}

/** The game worker's room info (`GET /parties/main/<room>`), or null when it isn't usable. */
export function parseRoomOccupancy(data: unknown): RoomOccupancy | null {
  if (!data || typeof data !== 'object') return null;
  const { playerCount, maxPlayers, phase } = data as Record<string, unknown>;
  if (typeof playerCount !== 'number' || typeof maxPlayers !== 'number' || maxPlayers <= 0) return null;
  return { playerCount, maxPlayers, inGame: typeof phase === 'string' && phase !== GamePhase.LOBBY };
}

/**
 * Live seat count of a room (e.g. "3/6" on an invite). Polls while mounted and the tab is
 * visible; the worker answers without joining, so this never takes a seat.
 */
export function useRoomOccupancy(roomCode: string): RoomOccupancy | null {
  const [loaded, setLoaded] = useState<{ roomCode: string; occupancy: RoomOccupancy | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = buildPartyRoomUrl(getDefaultHost(), roomCode);
    const load = () => {
      if (document.visibilityState === 'hidden') return;
      fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (!cancelled) setLoaded({ roomCode, occupancy: parseRoomOccupancy(data) });
        })
        .catch(() => undefined);
    };
    load();
    const timer = setInterval(load, POLL_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, [roomCode]);

  return loaded?.roomCode === roomCode ? loaded.occupancy : null;
}
