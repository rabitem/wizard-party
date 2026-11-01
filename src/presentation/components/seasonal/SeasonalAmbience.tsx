'use client';

import { memo, useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import type { ThemePreference } from '@/presentation/components/settings/settings-persistence';
import { SEASONAL_PACKS, type AmbientPack } from '@/presentation/config/seasonal-ambience.config';
import { createAmbienceEngine } from './ambience/engine';
import { readDeviceSignals, resolveDeviceTier } from './ambience/device-tier';
import { useActiveTheme } from './useActiveTheme';
import styles from './seasonal.module.css';

/** One full-viewport canvas running the theme's particle pack. Remounted per theme. */
function AmbienceCanvas({ pack, reducedMotion }: { pack: AmbientPack; reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const tier = resolveDeviceTier(readDeviceSignals());
    const engine = createAmbienceEngine(canvas, { pack, tier, reducedMotion });
    return () => engine.destroy();
  }, [pack, reducedMotion]);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}

/**
 * Global themed backdrop. Paints var(--page-bg) as a fixed layer behind all content
 * (z-index -1) and, for themes with an ambient pack, a canvas of realistic particles: parallax
 * snow with gusts, tumbling leaves and petals, sun motes, Halloween fog, bats and embers, neon
 * sparks and rain, pixel and celestial stars, solarpunk pollen and seeds. Under
 * prefers-reduced-motion it draws one sparse static frame; it pauses in hidden tabs and is skipped
 * on full-screen 3D game pages. Mount once (root layout).
 */
export const SeasonalAmbience = memo(() => {
  const theme: ThemePreference = useActiveTheme();
  const reducedMotion = useReducedMotion() ?? false;
  const pack = SEASONAL_PACKS[theme];
  return (
    <div className={styles.backdrop} aria-hidden="true" data-theme-ambience={theme}>
      {pack?.layers.length ? <AmbienceCanvas key={theme} pack={pack} reducedMotion={reducedMotion} /> : null}
    </div>
  );
});

SeasonalAmbience.displayName = 'SeasonalAmbience';
