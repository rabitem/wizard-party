'use client';

import { useEffect } from 'react';
import { useSelectedTableTheme } from '../../table/table-theme';
import { usePrefersReducedMotion } from '../themed-environments/primitives/usePrefersReducedMotion';
import { CardLandDust } from '../CardLandDust';
import { getLandEffectId } from './land-fx-selection';
import { LayeredLandEffect } from './LayeredLandEffect';
import { LAND_FX_RECIPES } from './recipes';

export interface CardLandEffectProps {
  position: [number, number, number];
  active: boolean;
  onComplete?: () => void;
}

/** Reduced motion: no particles, just report completion right away. */
function SkipLandEffect({ active, onComplete }: Pick<CardLandEffectProps, 'active' | 'onComplete'>) {
  useEffect(() => {
    if (active) onComplete?.();
  }, [active, onComplete]);
  return null;
}

/**
 * Card-land effect for the selected table theme ('dust' is the original
 * CardLandDust puff; seasonal / trend tables get their own effect).
 */
export function CardLandEffect({ position, active, onComplete }: CardLandEffectProps) {
  const tableTheme = useSelectedTableTheme();
  const reducedMotion = usePrefersReducedMotion();
  const effectId = getLandEffectId(tableTheme.id);

  if (effectId === 'dust') {
    return <CardLandDust position={position} active={active} onComplete={onComplete} />;
  }
  if (reducedMotion) {
    return <SkipLandEffect active={active} onComplete={onComplete} />;
  }
  return (
    <LayeredLandEffect
      key={effectId}
      recipe={LAND_FX_RECIPES[effectId]}
      position={position}
      active={active}
      onComplete={onComplete}
    />
  );
}
