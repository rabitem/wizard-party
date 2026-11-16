'use client';

import { memo } from 'react';
import { CardLandEffect } from './CardLandEffect';

/**
 * One hidden recipe per table keeps its shader programs alive between tricks. Individual card
 * effects own mutable uniforms and dispose on collection; releasing their last program would
 * otherwise make the first card in the next trick link it again. ShaderWarmup also visits this
 * recipe before the first deal. The outer group prevents even the classic dust from drawing.
 */
function CardLandEffectWarmupView() {
  return <group visible={false}><CardLandEffect position={[0, 0, 0]} active={false} /></group>;
}

export const CardLandEffectWarmup = memo(CardLandEffectWarmupView);
