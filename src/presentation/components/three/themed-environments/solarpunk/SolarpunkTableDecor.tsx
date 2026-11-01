'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SOLARPUNK_COLORS, SOLARPUNK_RIM } from '@/presentation/config/solarpunk-environment.config';
import { InstancedProp, useDisposables, usePrefersReducedMotion, type PropPlacement } from '../primitives';
import { createFrondGeometry, createPotGeometry, createRosetteGeometry, createRotorGeometry, createTowerGeometry, POT } from './solarpunk-geometry';
import { createPanelTexture } from './solarpunk-textures';

const { FERN, PANEL, TURBINE, SUCCULENT } = SOLARPUNK_RIM;
const MINI_FRONDS = 7;
const MINI_ROTOR_BLADE = 0.55;
const TURBINE_HEIGHT = 1.9;
const PANEL_POST = 0.55;
const PANEL_TILT = 0.5;

const MINI_POTS: PropPlacement[] = [
  { position: FERN.position, scale: FERN.scale, color: SOLARPUNK_COLORS.terracotta },
  { position: SUCCULENT.position, scale: SUCCULENT.scale, color: SOLARPUNK_COLORS.pot },
];
const FERN_SOIL_Y = FERN.position[1] + POT.SOIL_Y * FERN.scale;
const MINI_FRONDS_PLACEMENTS: PropPlacement[] = Array.from({ length: MINI_FRONDS }, (_, i) => ({
  position: [FERN.position[0], FERN_SOIL_Y, FERN.position[2]],
  scale: FERN.scale * (1.1 + (i % 3) * 0.15),
  rotationY: FERN.rotationY + (i / MINI_FRONDS) * Math.PI * 2,
  tilt: [0, -(0.45 + (i % 2) * 0.35)],
  color: i % 2 === 0 ? SOLARPUNK_COLORS.leaf : SOLARPUNK_COLORS.leafLight,
}));
const SUCCULENT_SOIL_Y = SUCCULENT.position[1] + POT.SOIL_Y * SUCCULENT.scale;

/** Brass mini turbine whose rotor spins (still for reduced motion). */
function MiniTurbine({ tower, rotor, brass, white }: { tower: THREE.BufferGeometry; rotor: THREE.BufferGeometry; brass: THREE.Material; white: THREE.Material }) {
  const rotorRef = useRef<THREE.Mesh>(null);
  const reducedMotion = usePrefersReducedMotion();
  const s = TURBINE.scale;
  useFrame((_, delta) => {
    if (!reducedMotion && rotorRef.current) rotorRef.current.rotation.z += delta * SOLARPUNK_RIM.TURBINE_SPIN;
  });
  return (
    <group position={TURBINE.position} rotation={[0, TURBINE.rotationY, 0]}>
      <mesh material={brass} position={[0, 0.01, 0]} scale={[s * 0.5, 0.02, s * 0.5]}>
        <cylinderGeometry args={[1, 1, 1, 12]} />
      </mesh>
      <mesh geometry={tower} material={white} scale={[s * 0.7, s * TURBINE_HEIGHT, s * 0.7]} />
      <mesh material={brass} position={[0, s * TURBINE_HEIGHT, 0]} scale={[s * 0.1, s * 0.1, s * 0.28]}>
        <boxGeometry />
      </mesh>
      <mesh ref={rotorRef} geometry={rotor} material={white} position={[0, s * TURBINE_HEIGHT, s * 0.16]} scale={s} />
    </group>
  );
}

/**
 * Small visual-only decor on the wood rim (no colliders, outside the play
 * area): a potted mini fern, a mini solar panel on a brass post, a spinning
 * brass wind turbine and a succulent in a white pot.
 */
export function SolarpunkTableDecor() {
  const assets = useMemo(() => {
    const panelMap = createPanelTexture();
    return {
      panelMap,
      pot: createPotGeometry(),
      frond: createFrondGeometry(),
      rosette: createRosetteGeometry(),
      tower: createTowerGeometry(),
      rotor: createRotorGeometry(MINI_ROTOR_BLADE),
      ceramic: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55 }),
      foliage: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75, side: THREE.DoubleSide }),
      succulent: new THREE.MeshStandardMaterial({ color: '#8cc49a', roughness: 0.6, side: THREE.DoubleSide, emissive: '#1a3a20', emissiveIntensity: 0.2 }),
      brass: new THREE.MeshStandardMaterial({ color: SOLARPUNK_COLORS.brass, roughness: 0.3, metalness: 0.75 }),
      white: new THREE.MeshStandardMaterial({ color: SOLARPUNK_COLORS.turbine, roughness: 0.4 }),
      panel: new THREE.MeshStandardMaterial({ map: panelMap, roughness: 0.3, metalness: 0.2 }),
    };
  }, []);
  useDisposables(assets);
  const ps = PANEL.scale;

  return (
    <group>
      <InstancedProp geometry={assets.pot} material={assets.ceramic} placements={MINI_POTS} />
      <InstancedProp geometry={assets.frond} material={assets.foliage} placements={MINI_FRONDS_PLACEMENTS} />
      <mesh
        geometry={assets.rosette}
        material={assets.succulent}
        position={[SUCCULENT.position[0], SUCCULENT_SOIL_Y, SUCCULENT.position[2]]}
        rotation={[0, SUCCULENT.rotationY, 0]}
        scale={SUCCULENT.scale * 0.9}
      />

      <group position={PANEL.position} rotation={[0, PANEL.rotationY, 0]}>
        <mesh material={assets.brass} position={[0, (ps * PANEL_POST) / 2, 0]} scale={[ps * 0.05, ps * PANEL_POST, ps * 0.05]}>
          <cylinderGeometry args={[1, 1, 1, 6]} />
        </mesh>
        <mesh material={assets.panel} position={[0, ps * PANEL_POST, 0]} rotation={[PANEL_TILT, 0, 0]} scale={[ps, ps * 0.04, ps * 0.65]}>
          <boxGeometry />
        </mesh>
      </group>

      <MiniTurbine tower={assets.tower} rotor={assets.rotor} brass={assets.brass} white={assets.white} />
    </group>
  );
}
