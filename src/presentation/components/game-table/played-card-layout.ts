import { getRotatedPlayedCardRestY } from '../three/cardAnimationHelpers';

interface StaticPlayedCardPositionParams {
  targetPosition: [number, number, number];
  targetRotation: [number, number, number];
  scale: number;
}

export function getStaticPlayedCardPosition({
  targetPosition,
  targetRotation,
  scale,
}: StaticPlayedCardPositionParams): [number, number, number] {
  return [
    targetPosition[0],
    Math.max(
      targetPosition[1],
      getRotatedPlayedCardRestY({
        rotationX: targetRotation[0],
        rotationY: targetRotation[1],
        rotationZ: targetRotation[2],
        cardScale: scale,
      })
    ),
    targetPosition[2],
  ];
}
