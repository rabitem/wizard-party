import { useMemo } from 'react';
import { IPlayer } from '@shared/domain';
import { TABLE_SURFACE } from '../../../config/physics.config';
import type { PlayerPosition } from '../types';

interface UsePlayerPositionsProps {
  players: IPlayer[];
  localPlayerId: string;
}

export function usePlayerPositions({
  players,
  localPlayerId,
}: UsePlayerPositionsProps): PlayerPosition[] {
  return useMemo(() => {
    const count = players.length;
    const localIndex = players.findIndex((p) => p.id === localPlayerId);
    const positions: PlayerPosition[] = [];

    for (let i = 0; i < count; i++) {
      const relativeIndex = (i - localIndex + count) % count;
      const angle = (relativeIndex / count) * Math.PI * 2 + Math.PI / 2;

      const tableRadius = 2.6;
      const cardRadius = 1.3;
      const x = Math.cos(angle);
      const z = Math.sin(angle);

      positions.push({
        cardPos: [x * cardRadius * 0.75, TABLE_SURFACE.CARD_REST_Y, z * cardRadius * 0.75], // On table surface
        seatPos: [x * tableRadius, -0.08, z * tableRadius],
        startPos: [x * tableRadius * 0.95, 0.3, z * tableRadius * 0.95], // Start above table
        handPos: [x * tableRadius * 0.95, 0.15, z * tableRadius * 0.95],
        rotation: -angle + Math.PI / 2,
      });
    }

    return positions;
  }, [players, localPlayerId]);
}
