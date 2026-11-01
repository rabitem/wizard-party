import { describe, expect, it } from 'vitest';
import { TABLE_SURFACE } from '../../config/physics.config';
import { resolveCardAnimationPositions, type PositionTuple } from './cardAnimationMotion';

/** Seat yaw as usePlayerPositions lays it out: the viewer always sits at angle PI / 2 */
function seatRotationFor(seatIndex: number, viewerIndex: number, playerCount: number): number {
  const relativeIndex = (seatIndex - viewerIndex + playerCount) % playerCount;
  const angle = (relativeIndex / playerCount) * Math.PI * 2 + Math.PI / 2;
  return -angle + Math.PI / 2;
}

function seatAngle(position: PositionTuple): number {
  return Math.atan2(position[2], position[0]);
}

describe('resolveCardAnimationPositions', () => {
  // Recorded by the thrower, whose own seat is always at +Z in its scene
  const physicsState = {
    startPosition: { x: 0, y: 0.35, z: 2.3 },
    landingPosition: { x: 0, y: TABLE_SURFACE.CARD_REST_Y, z: 0.8 },
    throwVelocity: { x: 0, y: 0, z: -4 },
    physicsSeed: 7,
  };

  it('maps a remote drag throw onto the thrower seat in this client scene', () => {
    const { effectiveStartPosition, effectiveTargetPosition } = resolveCardAnimationPositions({
      isLocalPlayer: false,
      startPosition: [0, 0.3, 0],
      targetPosition: [0, TABLE_SURFACE.CARD_REST_Y, 0],
      physicsState,
      seatRotation: -Math.PI / 2,
    });

    expect(effectiveTargetPosition[0]).toBeCloseTo(-0.8);
    expect(effectiveTargetPosition[1]).toBeCloseTo(TABLE_SURFACE.CARD_REST_Y);
    expect(effectiveTargetPosition[2]).toBeCloseTo(0);
    expect(effectiveStartPosition[0]).toBeCloseTo(-2.3);
    expect(effectiveStartPosition[2]).toBeCloseTo(0);
  });

  it.each([
    { seatIndex: 1, viewerIndex: 0, playerCount: 4 },
    { seatIndex: 3, viewerIndex: 1, playerCount: 5 },
    { seatIndex: 0, viewerIndex: 4, playerCount: 6 },
  ])('lands in the sector of seat $seatIndex for viewer $viewerIndex of $playerCount', (layout) => {
    const playerCount = layout.playerCount;
    const seatRotation = seatRotationFor(layout.seatIndex, layout.viewerIndex, playerCount);
    const expectedAngle = -seatRotation + Math.PI / 2;
    const { effectiveTargetPosition } = resolveCardAnimationPositions({
      isLocalPlayer: false,
      startPosition: [0, 0.3, 0],
      targetPosition: [0, TABLE_SURFACE.CARD_REST_Y, 0],
      physicsState,
      seatRotation,
    });

    const angleError = Math.atan2(
      Math.sin(seatAngle(effectiveTargetPosition) - expectedAngle),
      Math.cos(seatAngle(effectiveTargetPosition) - expectedAngle)
    );
    expect(Math.abs(angleError)).toBeLessThan(1e-6);
  });

  it('leaves the local player positions in its own scene', () => {
    const { effectiveStartPosition, effectiveTargetPosition } = resolveCardAnimationPositions({
      isLocalPlayer: true,
      startPosition: [0, 0.3, 2.47],
      targetPosition: [0, TABLE_SURFACE.CARD_REST_Y, 0.97],
      physicsState,
      seatRotation: -Math.PI / 2,
    });

    expect(effectiveStartPosition).toEqual([0, 0.3, 2.47]);
    expect(effectiveTargetPosition).toEqual([0, TABLE_SURFACE.CARD_REST_Y, 0.97]);
  });

  it('keeps seat fallbacks unrotated when no synchronized positions exist', () => {
    const { effectiveTargetPosition } = resolveCardAnimationPositions({
      isLocalPlayer: false,
      startPosition: [-2.47, 0.3, 0],
      targetPosition: [-0.97, TABLE_SURFACE.CARD_REST_Y, 0],
      physicsState: { physicsSeed: 7 },
      seatRotation: -Math.PI / 2,
    });

    expect(effectiveTargetPosition).toEqual([-0.97, TABLE_SURFACE.CARD_REST_Y, 0]);
  });
});
