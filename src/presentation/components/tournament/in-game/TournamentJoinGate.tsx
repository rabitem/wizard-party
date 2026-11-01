'use client';

import { useEffect, type ReactNode } from 'react';

import { useTournamentTable } from '@/presentation/providers/TournamentTableProvider';

import { TournamentJoinRejected } from './TournamentJoinRejected';

/**
 * Wraps a room page: when the game worker refused this room's tournament seat, the refusal is
 * explained instead of the page. Leaving the page forgets the refusal, so coming back with a
 * fresh ticket from the tournament page joins again.
 */
export function TournamentJoinGate({ roomId, children }: { roomId: string; children: ReactNode }) {
  const { rejection, dismissRejection } = useTournamentTable();
  useEffect(() => dismissRejection, [dismissRejection]);
  if (rejection?.roomId === roomId) return <TournamentJoinRejected rejection={rejection} />;
  return children;
}
