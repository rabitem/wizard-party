import * as THREE from 'three';
import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { asOverlay } from '../LayeredSurface';
import { SURFACE_LAYOUT } from '../surface.config';
import { createRadialRingGeometry } from '../surface-geometry';
import { createPoolWaterMaterial } from './pool-water.material';
import {
  paintDeckMosaic,
  paintDeckWetness,
  paintMattress,
  paintRingStripes,
  paintWallTiles,
} from './pool-tile-textures';

/** Pool edge: raised coping around the water, inner tiled wall, mosaic deck over the wood rim. */
export const POOL_EDGE = {
  /** Inner wall radius - stays outside the play radius (2.8) */
  WALL_RADIUS: 2.86,
  COPING_OUTER: 2.97,
  COPING_Y: 0.052,
  WALL_BOTTOM: 0.002,
  OUTER_WALL_BOTTOM: -0.018,
} as const;

const SEGMENTS = SURFACE_LAYOUT.SEGMENTS;

function createEdgeGeometries() {
  const E = POOL_EDGE;
  const wallHeight = E.COPING_Y - E.WALL_BOTTOM;
  const outerHeight = E.COPING_Y - E.OUTER_WALL_BOTTOM;
  const innerWall = new THREE.CylinderGeometry(E.WALL_RADIUS, E.WALL_RADIUS, wallHeight, SEGMENTS, 1, true);
  innerWall.translate(0, E.WALL_BOTTOM + wallHeight / 2, 0);
  const outerWall = new THREE.CylinderGeometry(E.COPING_OUTER, E.COPING_OUTER, outerHeight, SEGMENTS, 1, true);
  outerWall.translate(0, E.OUTER_WALL_BOTTOM + outerHeight / 2, 0);
  return {
    innerWall,
    outerWall,
    copingTop: createRadialRingGeometry(E.WALL_RADIUS, E.COPING_OUTER, SEGMENTS),
    deckGeometry: createRadialRingGeometry(E.COPING_OUTER, SURFACE_LAYOUT.RIM_OUTER, SEGMENTS),
  };
}

/** Chrome, wood, vinyl and rubber for the poolside props. */
function createPropMaterials() {
  const ringStripes = paintRingStripes();
  const mattressMap = paintMattress();
  return {
    ringStripes,
    mattressMap,
    chrome: new THREE.MeshStandardMaterial({ color: '#eef3f7', metalness: 0.9, roughness: 0.14 }),
    paddleWood: new THREE.MeshStandardMaterial({ color: '#b98252', roughness: 0.55 }),
    paddleGrip: new THREE.MeshStandardMaterial({ color: '#2b6f9e', roughness: 0.6 }),
    swimRing: new THREE.MeshStandardMaterial({ map: ringStripes, roughness: 0.3 }),
    mattress: new THREE.MeshStandardMaterial({ map: mattressMap, roughness: 0.32 }),
    duckBody: new THREE.MeshStandardMaterial({ color: '#ffd23a', roughness: 0.38 }),
    duckBeak: new THREE.MeshStandardMaterial({ color: '#ff8a1f', roughness: 0.45 }),
    duckEye: new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.2 }),
  };
}

/** Animated water, tiled pool edge with wet highlights and poolside prop materials for the summer table. */
export function createPoolAssets(palette: TableThemePalette) {
  const deckMap = paintDeckMosaic();
  const deckWetness = paintDeckWetness();
  const wallMap = paintWallTiles();
  const copingProps = { color: '#f3efe4', roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.25 };
  return {
    deckMap,
    deckWetness,
    wallMap,
    water: createPoolWaterMaterial(),
    deck: asOverlay(
      new THREE.MeshPhysicalMaterial({
        map: deckMap,
        roughnessMap: deckWetness,
        roughness: 1,
        clearcoat: 0.6,
        clearcoatRoughness: 0.18,
      }),
    ),
    wall: new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.25, side: THREE.BackSide }),
    coping: new THREE.MeshPhysicalMaterial(copingProps),
    // Sun-warmed sandstone coping over the armrest, nudged toward the terrace wood tone
    stone: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#efe6d2').lerp(new THREE.Color(palette.wood.base), 0.15),
      roughness: 0.78,
    }),
    ...createEdgeGeometries(),
    ...createPropMaterials(),
  };
}
