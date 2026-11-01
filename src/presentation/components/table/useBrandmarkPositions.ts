'use client';

import { useMemo } from 'react';
import { IPlayer } from '@shared/domain';
import { CAMERA_CONFIG } from '@/presentation/config/layout.config';
import { getSeatPlateRotation, getSeatRimAngle } from './seat-geometry';

export interface BrandmarkPosition {
  pos: [number, number, number];
  rotation: number;
}

interface UseBrandmarkPositionsParams {
  players: IPlayer[];
  localPlayerId?: string;
  rimRadius?: number;
}

/**
 * Custom hook for calculating brandmark positions around the table rim.
 * Positions are calculated relative to the local player's position.
 */
export function useBrandmarkPositions({
  players,
  localPlayerId,
  rimRadius = CAMERA_CONFIG.FRAMING.SEAT_RIM_RADIUS,
}: UseBrandmarkPositionsParams): BrandmarkPosition[] {
  return useMemo(() => {
    const count = players.length;
    if (count === 0) return [];

    const localIndex = players.findIndex((p) => p.id === localPlayerId);
    const positions: BrandmarkPosition[] = [];

    for (let i = 0; i < count; i++) {
      const relativeIndex = (i - localIndex + count) % count;
      const angle = getSeatRimAngle(relativeIndex, count);

      const x = Math.cos(angle) * rimRadius;
      const z = Math.sin(angle) * rimRadius;

      positions.push({
        pos: [x, 0.02, z], // Higher above wood surface
        rotation: getSeatPlateRotation(angle),
      });
    }

    return positions;
  }, [players, localPlayerId, rimRadius]);
}
