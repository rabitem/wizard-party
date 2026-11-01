'use client';

import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SUMMER_COLORS, SUMMER_LAYOUT, SUMMER_WIND } from '@/presentation/config/summer-environment.config';
import { seededRandom, useDisposables, usePrefersReducedMotion } from '../primitives';
import { MatrixInstances } from '../primitives/MatrixInstances';
import { createFrondGeometry } from './summer-geometry';
import { applyFrondSway, createBarkTexture, createFrondTexture, FROND_WIND_UNIFORMS } from './summer-textures';

const TRUNK = { SEGMENTS: 7, BASE_RADIUS: 0.26, TOP_RADIUS: 0.16, OVERLAP: 1.08 } as const;
const FROND_PITCH = { MIN: -0.15, EXTRA: 0.55 } as const;
const COCONUT = { RADIUS: 0.14, COUNT: 3, OFFSET: 0.22 } as const;
const FROND_COLORS = [SUMMER_COLORS.frond, SUMMER_COLORS.frondDark] as const;
const UP = new THREE.Vector3(0, 1, 0);
const LEAF_ALPHA_TEST = 0.45;
const BARK_BUMP = 1.6;

interface PalmParts {
  trunk: THREE.Matrix4[];
  fronds: THREE.Matrix4[];
  coconuts: THREE.Matrix4[];
}

/** Point on a palm's curved trunk (quadratic lean towards the lean direction). */
function trunkPoint(base: THREE.Vector3, height: number, leanX: number, leanZ: number, t: number): THREE.Vector3 {
  const lean = t * t;
  return new THREE.Vector3(base.x + leanX * lean, base.y + height * t, base.z + leanZ * lean);
}

/** Trunk segments, fronds and coconuts for every palm as world matrices. */
function buildPalms(sandY: number): PalmParts {
  const rand = seededRandom(149);
  const parts: PalmParts = { trunk: [], fronds: [], coconuts: [] };
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const euler = new THREE.Euler(0, 0, 0, 'YZX');

  SUMMER_LAYOUT.PALMS.forEach(([x, z, height, leanAngle, leanAmount]) => {
    const base = new THREE.Vector3(x, sandY, z);
    const leanX = Math.cos(leanAngle) * leanAmount;
    const leanZ = Math.sin(leanAngle) * leanAmount;
    for (let s = 0; s < TRUNK.SEGMENTS; s++) {
      const from = trunkPoint(base, height, leanX, leanZ, s / TRUNK.SEGMENTS);
      const to = trunkPoint(base, height, leanX, leanZ, (s + 1) / TRUNK.SEGMENTS);
      const direction = to.clone().sub(from);
      const length = direction.length() * TRUNK.OVERLAP;
      const radius = THREE.MathUtils.lerp(TRUNK.BASE_RADIUS, TRUNK.TOP_RADIUS, s / TRUNK.SEGMENTS);
      quaternion.setFromUnitVectors(UP, direction.normalize());
      parts.trunk.push(new THREE.Matrix4().compose(from, quaternion, scale.set(radius, length, radius)));
    }

    const crown = trunkPoint(base, height, leanX, leanZ, 1);
    const fronds = SUMMER_LAYOUT.FRONDS_PER_PALM;
    for (let f = 0; f < fronds; f++) {
      const yaw = (f / fronds) * Math.PI * 2 + rand() * 0.4;
      const pitch = FROND_PITCH.MIN + rand() * FROND_PITCH.EXTRA;
      euler.set(0, yaw, pitch);
      quaternion.setFromEuler(euler);
      const size = 0.85 + rand() * 0.3;
      parts.fronds.push(new THREE.Matrix4().compose(crown, quaternion, scale.set(size, size, size)));
    }
    for (let c = 0; c < COCONUT.COUNT; c++) {
      const angle = (c / COCONUT.COUNT) * Math.PI * 2 + rand();
      const position = new THREE.Vector3(crown.x + Math.cos(angle) * COCONUT.OFFSET, crown.y - COCONUT.RADIUS * 1.2, crown.z + Math.sin(angle) * COCONUT.OFFSET);
      parts.coconuts.push(new THREE.Matrix4().compose(position, quaternion.identity(), scale.setScalar(1)));
    }
  });
  return parts;
}

/** Advances the shared frond wind clock (fronds stay still with reduced motion). */
function useFrondWind() {
  const reducedMotion = usePrefersReducedMotion();
  useFrame(({ clock }) => {
    FROND_WIND_UNIFORMS.uWindTime.value = reducedMotion ? 0 : clock.getElapsedTime() * SUMMER_WIND.SPEED;
  });
}

/**
 * Leaning palms on the beach: ringed bark trunks, feathery pinnate fronds
 * that sway in the sea breeze (vertex shader) and coconut clusters.
 */
export function PalmTrees() {
  const parts = useMemo(() => buildPalms(SUMMER_LAYOUT.SAND_Y), []);
  const assets = useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.85, 1, 1, 10);
    trunk.translate(0, 0.5, 0);
    const barkMap = createBarkTexture();
    const frondMap = createFrondTexture();
    return {
      trunk,
      barkMap,
      frondMap,
      frond: createFrondGeometry(),
      coconut: new THREE.SphereGeometry(COCONUT.RADIUS, 10, 8),
      bark: new THREE.MeshStandardMaterial({ color: SUMMER_COLORS.palmTrunk, map: barkMap, bumpMap: barkMap, bumpScale: BARK_BUMP, roughness: 0.95 }),
      leaf: applyFrondSway(
        new THREE.MeshStandardMaterial({ color: '#ffffff', map: frondMap, alphaTest: LEAF_ALPHA_TEST, roughness: 0.7, side: THREE.DoubleSide }),
      ),
      shell: new THREE.MeshStandardMaterial({ color: SUMMER_COLORS.coconut, roughness: 0.65 }),
    };
  }, []);
  useDisposables(assets);
  useFrondWind();

  return (
    <group>
      <MatrixInstances geometry={assets.trunk} material={assets.bark} matrices={parts.trunk} />
      <MatrixInstances geometry={assets.frond} material={assets.leaf} matrices={parts.fronds} colors={FROND_COLORS} />
      <MatrixInstances geometry={assets.coconut} material={assets.shell} matrices={parts.coconuts} />
    </group>
  );
}
