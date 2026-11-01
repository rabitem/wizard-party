'use client';

import { useMemo } from 'react';
import {
  HALLOWEEN_COLORS,
  HALLOWEEN_RIM_CANDLES,
  HALLOWEEN_RIM_PUMPKINS,
  HALLOWEEN_RIM_PUMPKIN_SCALE,
} from '@/presentation/config/halloween-environment.config';
import { CandleCluster, PumpkinPatch, type PumpkinPlacement } from '../primitives';

/**
 * Tiny jack-o'-lanterns and candles on the wood rim. Purely visual (no
 * colliders) and placed in the safe rim slots outside the play area.
 */
export function HalloweenTableDecor() {
  const pumpkins = useMemo<PumpkinPlacement[]>(
    () =>
      HALLOWEEN_RIM_PUMPKINS.map((pumpkin) => ({
        ...pumpkin,
        scale: HALLOWEEN_RIM_PUMPKIN_SCALE,
        carved: true,
        color: HALLOWEEN_COLORS.pumpkin,
      })),
    [],
  );

  return (
    <group>
      <PumpkinPatch
        pumpkins={pumpkins}
        faceColor={HALLOWEEN_COLORS.faceGlow}
        glowColor={HALLOWEEN_COLORS.pumpkinGlow}
        glowStrength={0.55}
      />
      <CandleCluster candles={HALLOWEEN_RIM_CANDLES} waxColor={HALLOWEEN_COLORS.candleWax} glowStrength={0.45} />
    </group>
  );
}
