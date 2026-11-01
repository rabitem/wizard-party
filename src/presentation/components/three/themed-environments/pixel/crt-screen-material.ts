import * as THREE from 'three';
import { PIXEL_REALISM, PIXEL_SCREENS } from '@/presentation/config/pixel-environment.config';

const { SCREEN } = PIXEL_REALISM;

export interface CrtScreenMaterial {
  material: THREE.MeshBasicMaterial;
  /** Advances the rolling refresh band */
  setTime: (time: number) => void;
}

const CRT_PARS = /* glsl */ `
uniform float uCrtTime;
`;

/**
 * Runs after map_fragment. vMapUv.x spans every atlas tile, so the tile-local
 * coordinate is recovered with fract(). Scanlines fade out once a texel row is
 * smaller than a screen pixel (fwidth) to avoid moire on small screens.
 */
const CRT_FRAGMENT = /* glsl */ `
#ifdef USE_MAP
  vec2 crtUv = vec2(fract(vMapUv.x * ${PIXEL_SCREENS.VARIANTS.toFixed(1)}), vMapUv.y);
  float rows = crtUv.y * ${PIXEL_SCREENS.TILE_HEIGHT.toFixed(1)};
  float rowFootprint = fwidth(rows);
  float scanStrength = ${SCREEN.SCANLINE_STRENGTH.toFixed(3)} * (1.0 - smoothstep(0.35, 0.8, rowFootprint));
  float scan = 1.0 - scanStrength * (0.5 + 0.5 * cos(rows * 6.2831853));
  float bandPos = fract(crtUv.y - uCrtTime * ${SCREEN.ROLL_SPEED.toFixed(3)}) - 0.5;
  float band = 1.0 + ${SCREEN.ROLL_STRENGTH.toFixed(3)} * exp(-bandPos * bandPos * 60.0);
  vec2 centred = crtUv - 0.5;
  float vignette = clamp(1.0 - dot(centred, centred) * ${SCREEN.VIGNETTE.toFixed(3)}, 0.0, 1.0);
  diffuseColor.rgb *= scan * band * vignette;
#endif
`;

/**
 * Cabinet screen material: the animated pixel atlas with CRT scanlines, a
 * slow rolling refresh band and a curved-glass vignette, pushed above 1.0 so
 * the room bloom makes the screens glow. One shared program for every screen.
 */
export function createCrtScreenMaterial(map: THREE.Texture): CrtScreenMaterial {
  const time = { value: 0 };
  const material = new THREE.MeshBasicMaterial({ map, toneMapped: false });
  material.color.setScalar(SCREEN.BRIGHTNESS);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCrtTime = time;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${CRT_PARS}`)
      .replace('#include <map_fragment>', `#include <map_fragment>\n${CRT_FRAGMENT}`);
  };
  material.customProgramCacheKey = () => 'pixel-crt-screen';
  return {
    material,
    setTime: (value: number) => {
      time.value = value;
    },
  };
}
