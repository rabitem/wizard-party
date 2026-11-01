'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SOLARPUNK_COLORS, SOLARPUNK_SUN_SHAFTS, SOLARPUNK_WATER, SOLARPUNK_WATER_LOOK } from '@/presentation/config/solarpunk-environment.config';
import { addSurfaceDetail, InstancedProp, seededRandom, useDisposables, type PropPlacement } from '../primitives';
import { createLilyPadGeometry, createLotusGeometry } from './solarpunk-geometry';
import { useShaderTime } from './useShaderTime';
import { createCausticsMaterial, createWaterSurfaceMaterial } from './water-materials';

const W = SOLARPUNK_WATER;
const [CX, FLOOR, CZ] = W.CENTER;
const PAD_LIFT = 0.006;
const LOOK = SOLARPUNK_WATER_LOOK;
const BED_LIFT = 0.02;
const CAUSTIC_LIFT = 0.012;
/** Direction towards the sun, from the shaft lean (glints line up with the light) */
const SUN_DIRECTION: [number, number, number] = (() => {
  const { source, target } = SOLARPUNK_SUN_SHAFTS.SHAFTS[0];
  return [source[0] - target[0], source[1] - target[1], source[2] - target[2]];
})();

/** White stone kerbs on both long sides and both ends. */
const EDGES: PropPlacement[] = (() => {
  const outerZ = W.WIDTH / 2 + W.EDGE_WIDTH / 2;
  const y = FLOOR + W.EDGE_HEIGHT / 2;
  const fullLength = W.LENGTH + W.EDGE_WIDTH * 2;
  return [
    { position: [CX, y, CZ - outerZ], scale: [fullLength, W.EDGE_HEIGHT, W.EDGE_WIDTH] },
    { position: [CX, y, CZ + outerZ], scale: [fullLength, W.EDGE_HEIGHT, W.EDGE_WIDTH] },
    { position: [CX - W.LENGTH / 2 - W.EDGE_WIDTH / 2, y, CZ], scale: [W.EDGE_WIDTH, W.EDGE_HEIGHT, W.WIDTH] },
    { position: [CX + W.LENGTH / 2 + W.EDGE_WIDTH / 2, y, CZ], scale: [W.EDGE_WIDTH, W.EDGE_HEIGHT, W.WIDTH] },
  ];
})();

function scatterOnWater(count: number, seed: number, lift: number): PropPlacement[] {
  const rand = seededRandom(seed);
  return Array.from({ length: count }, (_, i) => ({
    position: [
      CX - W.LENGTH / 2 + ((i + 0.2 + rand() * 0.6) / count) * W.LENGTH,
      W.SURFACE_Y + lift,
      CZ + (rand() - 0.5) * (W.WIDTH - 0.5),
    ],
    scale: 0.8 + rand() * 0.6,
    rotationY: rand() * Math.PI * 2,
  }));
}

const LILY_PADS = scatterOnWater(W.LILY_COUNT, 61, PAD_LIFT);
const LOTUS = scatterOnWater(W.LOTUS_COUNT, 67, PAD_LIFT * 2).map((p) => ({ ...p, scale: 1 }));
/** Each lotus gets its own pad underneath */
const ALL_PADS = [...LILY_PADS, ...LOTUS.map((p) => ({ ...p, scale: 1.1, rotationY: (p.rotationY ?? 0) + 1 }))];

/**
 * A shallow water channel across the back of the atrium: white kerbs, a
 * dark bed with dancing caustics, an animated shader water surface (flowing
 * ripples, fresnel sky reflection, sun glints that bloom), lily pads and
 * pink lotus blooms, plus soft caustic light thrown onto the floor in front.
 * Frozen for reduced motion.
 */
export function WaterChannel() {
  const surfaceRef = useRef<THREE.Mesh>(null);
  const bedCausticRef = useRef<THREE.Mesh>(null);
  const floorCausticRef = useRef<THREE.Mesh>(null);
  const assets = useMemo(() => {
    const plane = new THREE.PlaneGeometry(1, 1);
    plane.rotateX(-Math.PI / 2);
    return {
      plane,
      box: new THREE.BoxGeometry(1, 1, 1),
      pad: createLilyPadGeometry(),
      lotus: createLotusGeometry(),
      kerb: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: SOLARPUNK_COLORS.frame, roughness: 0.55 }), { scale: 3, normalStrength: 0.25 }),
      bed: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: LOOK.bed, roughness: 0.9 }), { scale: 6, normalStrength: 0.5 }),
      water: createWaterSurfaceMaterial({ ...LOOK, flow: W.FLOW_SPEED, scale: 2.4, glint: 2.4, sunDirection: SUN_DIRECTION }),
      bedCaustics: createCausticsMaterial({ color: LOOK.CAUSTICS.color, intensity: LOOK.CAUSTICS.bedIntensity, scale: 1.8, edge: 0.08, shape: 'rect' }),
      floorCaustics: createCausticsMaterial({ color: LOOK.CAUSTICS.color, intensity: LOOK.CAUSTICS.floorIntensity, scale: 1.4, edge: 0.5, shape: 'rect' }),
      lily: new THREE.MeshStandardMaterial({ color: SOLARPUNK_COLORS.lily, roughness: 0.45, side: THREE.DoubleSide }),
      bloom: new THREE.MeshStandardMaterial({ color: SOLARPUNK_COLORS.lotus, roughness: 0.6, side: THREE.DoubleSide, emissive: '#ff9ac0', emissiveIntensity: 0.15 }),
    };
  }, []);
  useDisposables(assets);
  useShaderTime([surfaceRef, bedCausticRef, floorCausticRef]);

  const floorCausticZ = CZ + W.WIDTH / 2 + W.EDGE_WIDTH + LOOK.CAUSTICS.floorDepth / 2;
  return (
    <group>
      <InstancedProp geometry={assets.box} material={assets.kerb} placements={EDGES} />
      <mesh geometry={assets.plane} material={assets.bed} position={[CX, FLOOR + BED_LIFT, CZ]} scale={[W.LENGTH, 1, W.WIDTH]} />
      <mesh ref={bedCausticRef} geometry={assets.plane} material={assets.bedCaustics} position={[CX, FLOOR + BED_LIFT + 0.005, CZ]} scale={[W.LENGTH, 1, W.WIDTH]} />
      <mesh ref={surfaceRef} geometry={assets.plane} material={assets.water} position={[CX, W.SURFACE_Y, CZ]} scale={[W.LENGTH, 1, W.WIDTH]} renderOrder={2} />
      <mesh
        ref={floorCausticRef}
        geometry={assets.plane}
        material={assets.floorCaustics}
        position={[CX, FLOOR + CAUSTIC_LIFT, floorCausticZ]}
        scale={[W.LENGTH + 1, 1, LOOK.CAUSTICS.floorDepth]}
        renderOrder={1}
      />
      <InstancedProp geometry={assets.pad} material={assets.lily} placements={ALL_PADS} />
      <InstancedProp geometry={assets.lotus} material={assets.bloom} placements={LOTUS} />
    </group>
  );
}
