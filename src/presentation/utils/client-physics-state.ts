import type { ClientPhysicsState } from '@shared/domain';
import type { DropInfo } from '@/presentation/hooks/useDragToPlay';

interface VectorLike {
  x: number;
  y: number;
  z: number;
}

function toPhysicsVector(vector: VectorLike): ClientPhysicsState['landingPosition'] {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z,
  };
}

export function createClientPhysicsState(dropInfo?: DropInfo): ClientPhysicsState | undefined {
  if (!dropInfo) return undefined;

  return {
    throwVelocity: toPhysicsVector(dropInfo.velocity),
    landingPosition: toPhysicsVector(dropInfo.dropPosition),
    startPosition: toPhysicsVector(dropInfo.startPosition),
  };
}
