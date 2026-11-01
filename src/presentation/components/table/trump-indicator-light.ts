import { SCENE_LIGHTING } from '@/presentation/config/scene-lighting.config';

export interface TrumpIndicatorLightState {
  color: string;
  intensity: number;
}

/**
 * Colour and brightness of the trump glow. The light is never removed, only dimmed, so the
 * scene's point-light count (and with it every lit shader program) stays the same across phases.
 */
export function getTrumpIndicatorLightState(suitColor: string | null, active: boolean): TrumpIndicatorLightState {
  const config = SCENE_LIGHTING.trumpIndicator;
  return {
    color: suitColor ?? config.color,
    intensity: active ? config.intensity : 0,
  };
}
