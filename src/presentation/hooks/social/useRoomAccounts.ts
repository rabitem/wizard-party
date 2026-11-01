'use client';

import { useCallback, useEffect, useState } from 'react';

import type { RoomPlayerAccount } from '@shared/application/use-cases/friends';

import { socialApi } from '@/lib/social/social-api';

/** Other players claim their seats with their first heartbeat, so look again once it has passed. */
const RECHECK_AFTER_MS = 30_000;
const NO_SEATS: ReadonlyMap<string, RoomPlayerAccount> = new Map();

/**
 * Accounts behind the seats of the current room (gamePlayerId -> account), for "add friend" next
 * to in-game names. Reloads when the seated players change.
 */
export function useRoomAccounts(enabled: boolean, roomCode: string | null, seatKey: string) {
  // `roomCode` is only set once the server accepted the room (its seat attestation succeeded).
  const [loaded, setLoaded] = useState<{ roomCode: string; seats: ReadonlyMap<string, RoomPlayerAccount> } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled || !roomCode) return;
    let cancelled = false;
    const load = () =>
      socialApi.roomAccounts(roomCode).then(
        ({ seats: found }) => {
          if (!cancelled) setLoaded({ roomCode, seats: new Map(found.map((seat) => [seat.gamePlayerId, seat])) });
        },
        () => undefined
      );
    void load();
    const timer = setTimeout(() => void load(), RECHECK_AFTER_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, roomCode, seatKey, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  // Seats of another room (or from before sign-out) are never shown.
  const seats = enabled && loaded && loaded.roomCode === roomCode ? loaded.seats : NO_SEATS;
  return { seats, reload };
}
