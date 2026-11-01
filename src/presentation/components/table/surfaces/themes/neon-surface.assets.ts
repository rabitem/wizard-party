import * as THREE from 'three';
import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { asOverlay } from '../LayeredSurface';
import { SURFACE_TEXTURE_SIZE as SIZE } from '../surface.config';
import { createRadialRingGeometry } from '../surface-geometry';
import { paintTexture, seededRandom } from '../surface-textures';

export const NEON_STRIP = { INNER: 2.835, OUTER: 2.875, HALO_INNER: 2.74, HALO_OUTER: 2.97, Y: 0.0245 } as const;
const GRID = { MINOR: 32, MAJOR: 128 } as const;

/** White grid lines on black - used as an emissive map so the grid glows in the glass. */
function paintGrid() {
  return paintTexture(
    SIZE.TILE,
    SIZE.TILE,
    (ctx, w, h) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      for (let p = 0; p < w; p += GRID.MINOR) {
        ctx.fillRect(p, 0, 1, h);
        ctx.fillRect(0, p, w, 1);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      for (let p = 0; p < w; p += GRID.MAJOR) {
        ctx.fillRect(p, 0, 2, h);
        ctx.fillRect(0, p, w, 2);
      }
    },
    { repeat: [4, 4] },
  );
}

/** Soft falloff across the halo ring (v: inner -> outer). */
function paintHalo() {
  return paintTexture(4, 64, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  });
}

/** Two thin trace lines with circuit dashes for the rim's emissive map. */
function paintRimTraces() {
  return paintTexture(
    SIZE.STRIP_WIDTH,
    SIZE.STRIP_HEIGHT,
    (ctx, w, h) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, h * 0.18, w, 2);
      ctx.fillRect(0, h * 0.8, w, 2);
      const rand = seededRandom(4);
      for (let i = 0; i < 18; i++) {
        const x = rand() * w;
        const y = h * (0.3 + rand() * 0.4);
        ctx.fillRect(x, y, 20 + rand() * 60, 1.5);
        ctx.fillRect(x - 3, y - 2, 5, 5);
      }
    },
    { repeat: [6, 1] },
  );
}

const glow = (color: string, opacity = 1) =>
  asOverlay(new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: opacity < 1, opacity }));

/** Black glass with a glowing grid, a cyan edge strip and neon trims for the Neon Grid. */
export function createNeonAssets(palette: TableThemePalette) {
  const gridMap = paintGrid();
  const haloMap = paintHalo();
  const traceMap = paintRimTraces();
  const glass = { roughness: 0.08, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03 };
  const cyan = palette.accent.innerRing;
  const magenta = palette.accent.outerRing;
  const base = new THREE.MeshPhysicalMaterial({
    ...glass,
    color: palette.felt.base,
    emissive: new THREE.Color(cyan),
    emissiveMap: gridMap,
    emissiveIntensity: 0.55,
  });
  const center = base.clone();
  center.color.set(palette.felt.center);
  const halo = asOverlay(
    new THREE.MeshBasicMaterial({
      color: cyan,
      map: haloMap,
      blending: THREE.AdditiveBlending,
      opacity: 0.55,
      toneMapped: false,
    }),
    true,
  );
  return {
    gridMap,
    haloMap,
    traceMap,
    base,
    center,
    edge: new THREE.MeshPhysicalMaterial({ ...glass, color: palette.felt.edge }),
    innerRing: glow(magenta),
    outerRing: glow(cyan),
    strip: glow(cyan),
    halo,
    stripGeometry: createRadialRingGeometry(NEON_STRIP.INNER, NEON_STRIP.OUTER),
    haloGeometry: createRadialRingGeometry(NEON_STRIP.HALO_INNER, NEON_STRIP.HALO_OUTER),
    rim: asOverlay(
      new THREE.MeshPhysicalMaterial({
        ...glass,
        color: palette.wood.base,
        emissive: new THREE.Color(magenta),
        emissiveMap: traceMap,
        emissiveIntensity: 0.8,
      }),
    ),
    lipCap: new THREE.MeshStandardMaterial({ color: '#06060c', emissive: new THREE.Color(cyan), emissiveIntensity: 1.1, roughness: 0.3 }),
    outerCap: new THREE.MeshStandardMaterial({ color: '#06060c', emissive: new THREE.Color(magenta), emissiveIntensity: 1, roughness: 0.3 }),
  };
}
