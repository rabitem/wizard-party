'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { CELESTIAL_COLORS, CELESTIAL_LAYOUT } from '@/presentation/config/celestial-environment.config';
import { addSurfaceDetail, MatrixInstances, localMatrix, useDisposables } from '../primitives';
import { createBrassMaterial } from './celestial-materials';

const T = CELESTIAL_LAYOUT.TELESCOPE;
const LEG_SPREAD = 0.95;
const LEG_RADIUS = 0.06;
const TUBE = { BACK: 0.24, FRONT: 0.32, CAP: 0.38, CAP_LENGTH: 0.7, EYEPIECE: 0.08 } as const;
/** Tube balance point sits a third of the way from the eyepiece end. */
const PIVOT_RATIO = 0.35;
const BAND_POSITIONS = [0.12, 0.45, 0.78] as const;

/** Three splayed tripod legs meeting under the mount head. */
function legMatrices(): THREE.Matrix4[] {
  const length = Math.hypot(T.tripodHeight, LEG_SPREAD);
  const lean = Math.atan2(LEG_SPREAD, T.tripodHeight);
  return [0, 1, 2].map((i) => {
    const yaw = (i / 3) * Math.PI * 2;
    const foot = new THREE.Vector3(Math.cos(yaw) * LEG_SPREAD * 0.5, T.tripodHeight / 2, Math.sin(yaw) * LEG_SPREAD * 0.5);
    const matrix = localMatrix([foot.x, foot.y, foot.z], [0, -yaw, 0]);
    return matrix.multiply(localMatrix([0, 0, 0], [0, 0, lean], [1, length / T.tripodHeight, 1]));
  });
}

/**
 * Big brass refracting telescope on a wooden tripod, aimed at the dome.
 * Only ~10 draw calls: shared brass/wood materials, instanced legs and bands.
 */
export function Telescope() {
  const assets = useMemo(
    () => ({
      brass: createBrassMaterial({ emissiveIntensity: 0.2, roughness: 0.32 }),
      // Plank textures would wrap around the legs as rings: noise detail keeps the grain direction-free.
      wood: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: CELESTIAL_COLORS.wood, roughness: 0.75 }), { scale: 2 }),
      lens: new THREE.MeshStandardMaterial({
        color: '#9ab0ff',
        emissive: '#5a6ad0',
        emissiveIntensity: 1.1,
        roughness: 0.1,
        metalness: 0.2,
      }),
      leg: new THREE.CylinderGeometry(LEG_RADIUS * 0.7, LEG_RADIUS, T.tripodHeight, 8),
      head: new THREE.CylinderGeometry(0.22, 0.26, 0.24, 12),
      yoke: new THREE.BoxGeometry(0.1, 0.5, 0.1),
      tube: new THREE.CylinderGeometry(TUBE.FRONT, TUBE.BACK, T.tubeLength, 18, 1, true),
      cap: new THREE.CylinderGeometry(TUBE.CAP, TUBE.FRONT * 1.02, TUBE.CAP_LENGTH, 18, 1, true),
      band: new THREE.TorusGeometry(1, 0.06, 6, 24),
      lensDisc: new THREE.CircleGeometry(TUBE.FRONT, 18),
      eyepiece: new THREE.CylinderGeometry(TUBE.EYEPIECE, TUBE.EYEPIECE * 1.3, 0.4, 10),
      finder: new THREE.CylinderGeometry(0.06, 0.06, 1.1, 8),
    }),
    [],
  );
  useDisposables(assets);

  const legs = useMemo(() => legMatrices(), []);
  /** Tube bands: scale the unit torus to the tube radius at each position along the tube. */
  const bands = useMemo(
    () =>
      BAND_POSITIONS.map((f) => {
        const radius = TUBE.BACK + (TUBE.FRONT - TUBE.BACK) * f + 0.02;
        const y = (f - PIVOT_RATIO) * T.tubeLength;
        return localMatrix([0, y, 0], [Math.PI / 2, 0, 0], [radius, radius, 1]);
      }),
    [],
  );

  const tubeOffset = (0.5 - PIVOT_RATIO) * T.tubeLength;
  return (
    <group position={T.position} rotation={[0, T.yaw, 0]}>
      <MatrixInstances geometry={assets.leg} material={assets.wood} matrices={legs} />
      <mesh geometry={assets.head} material={assets.brass} position={[0, T.tripodHeight + 0.1, 0]} />
      <mesh geometry={assets.yoke} material={assets.brass} position={[-0.3, T.tripodHeight + 0.4, 0]} />
      <mesh geometry={assets.yoke} material={assets.brass} position={[0.3, T.tripodHeight + 0.4, 0]} />

      {/* Tube pivots on the yoke; its local +Y points along the line of sight */}
      <group position={[0, T.tripodHeight + 0.55, 0]} rotation={[-(Math.PI / 2 - T.pitch), 0, 0]}>
        <mesh geometry={assets.tube} material={assets.brass} position={[0, tubeOffset, 0]} />
        <mesh
          geometry={assets.cap}
          material={assets.brass}
          position={[0, tubeOffset + T.tubeLength / 2 + TUBE.CAP_LENGTH / 2 - 0.05, 0]}
        />
        <mesh
          geometry={assets.lensDisc}
          material={assets.lens}
          position={[0, tubeOffset + T.tubeLength / 2 - 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
        <mesh geometry={assets.eyepiece} material={assets.brass} position={[0, tubeOffset - T.tubeLength / 2 - 0.18, 0]} />
        <mesh geometry={assets.finder} material={assets.brass} position={[0, tubeOffset + 0.4, TUBE.FRONT + 0.12]} />
        <MatrixInstances geometry={assets.band} material={assets.brass} matrices={bands} />
      </group>
    </group>
  );
}
