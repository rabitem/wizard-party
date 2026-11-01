'use client';

import { Suit } from '@shared/domain';
import { getSuitTheme } from '@/presentation/hooks/useCardTheme';
import { SCENE_LIGHTING } from '@/presentation/config/scene-lighting.config';
import { getTrumpIndicatorLightState } from './trump-indicator-light';

interface TrumpIndicatorLightProps {
  suit: Suit | null;
  /** Whether the trump indicator is shown; the light only dims when it is not */
  active: boolean;
}

/** Point light above the trump indicator, mounted for the whole game */
export function TrumpIndicatorLight({ suit, active }: TrumpIndicatorLightProps) {
  const { color, intensity } = getTrumpIndicatorLightState(suit ? getSuitTheme(suit).accent : null, active);
  const { position, distance, decay } = SCENE_LIGHTING.trumpIndicator;

  return (
    <pointLight
      position={position}
      color={color}
      intensity={intensity}
      distance={distance}
      decay={decay}
    />
  );
}
