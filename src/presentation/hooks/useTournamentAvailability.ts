'use client';

import { useAuthCapabilities } from '@/presentation/hooks/account/useAuthCapabilities';

/**
 * Whether this deployment runs tournaments: false (switched off: no TOURNAMENT_SECRET or no
 * database), true, or null while unknown.
 */
export function useTournamentAvailability(): boolean | null {
  const capabilities = useAuthCapabilities();
  return capabilities === null ? null : capabilities.tournaments;
}
