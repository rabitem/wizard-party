'use client';

import { useEffect, useState } from 'react';

import { TOURNAMENT_UI } from '@/presentation/config/tournament.config';

/**
 * "Now" on the server's clock (`offsetMs` = serverTime - Date.now() of the last read), ticking
 * every TOURNAMENT_UI.CLOCK_TICK_MS while `active`, so countdowns agree with the server's deadlines
 * even when the device clock is off.
 */
export function useTournamentClock(offsetMs: number, active = true): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), TOURNAMENT_UI.CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, [active]);

  return now + offsetMs;
}
