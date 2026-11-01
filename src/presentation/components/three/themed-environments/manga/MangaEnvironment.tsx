'use client';

import { MANGA_BLOSSOM_COLORS, MANGA_COLORS, MANGA_DAYLIGHT, MANGA_LIGHTS, MANGA_SAKURA } from '@/presentation/config/manga-environment.config';
import { LightShafts, RealisticParticleField } from '../primitives';
import { CherryVase } from './CherryVase';
import { DojoFurniture } from './DojoFurniture';
import { DojoLanterns } from './DojoLanterns';
import { DojoScrolls } from './DojoScrolls';
import { DojoShell } from './DojoShell';
import { IncenseSmoke } from './IncenseSmoke';
import { MangaTableDecor } from './MangaTableDecor';

/**
 * Shonen Ink: a dojo drawn in ink. Woven tatami, shoji walls glowing with
 * the daylight behind the paper, soft light shafts with dust slanting in
 * through the open back wall onto the ink-wash mountain view, blooming paper
 * lanterns, calligraphy scrolls, a katana rack, low tables, a cherry branch
 * and curling incense smoke in the tokonoma, and sakura petals blowing in
 * from the garden. Cel-shaded with ink outlines on the key props.
 * Lights (no shadows): warm lantern key, cool daylight fill, hemisphere;
 * the atmosphere config adds a cool daylight key / warm fill and bloom.
 */
export function MangaEnvironment() {
  const { key, fill, hemisphereIntensity } = MANGA_LIGHTS;
  return (
    <group>
      <DojoShell />
      <DojoScrolls />
      <DojoFurniture />
      <CherryVase />
      <IncenseSmoke />
      <DojoLanterns />
      <MangaTableDecor />

      <LightShafts
        shafts={MANGA_DAYLIGHT.SHAFTS}
        color={MANGA_DAYLIGHT.COLOR}
        intensity={MANGA_DAYLIGHT.INTENSITY}
        dust={MANGA_DAYLIGHT.DUST_VOLUME}
        dustCount={MANGA_DAYLIGHT.DUST_COUNT}
      />
      <RealisticParticleField kind="petals" volume={MANGA_SAKURA.VOLUME} count={MANGA_SAKURA.COUNT} colors={MANGA_BLOSSOM_COLORS} wind={MANGA_SAKURA.WIND} seed={61} />

      <pointLight position={key.position} color={key.color} intensity={key.intensity} distance={key.distance} decay={2} />
      <pointLight position={fill.position} color={fill.color} intensity={fill.intensity} distance={fill.distance} decay={2} />
      <hemisphereLight args={[MANGA_COLORS.hemisphereSky, MANGA_COLORS.hemisphereGround, hemisphereIntensity]} position={[0, 10, 0]} />
    </group>
  );
}
