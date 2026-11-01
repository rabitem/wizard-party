import { describe, expect, it } from 'vitest';
import { SCENE_LIGHTING } from '@/presentation/config/scene-lighting.config';
import { getTrumpIndicatorLightState } from './trump-indicator-light';

describe('getTrumpIndicatorLightState', () => {
  it('glows in the suit colour while the indicator is shown', () => {
    expect(getTrumpIndicatorLightState('#ff0000', true)).toEqual({
      color: '#ff0000',
      intensity: SCENE_LIGHTING.trumpIndicator.intensity,
    });
  });

  it('dims to zero instead of unmounting when the indicator is hidden', () => {
    expect(getTrumpIndicatorLightState('#ff0000', false).intensity).toBe(0);
  });

  it('falls back to the default colour before a trump suit is known', () => {
    expect(getTrumpIndicatorLightState(null, true).color).toBe(SCENE_LIGHTING.trumpIndicator.color);
  });
});
