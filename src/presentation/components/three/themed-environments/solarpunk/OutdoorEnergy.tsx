'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SOLARPUNK_COLORS, SOLARPUNK_OUTSIDE } from '@/presentation/config/solarpunk-environment.config';
import { ENVIRONMENT_ROOM, type Vec3 } from '@/presentation/config/themed-environment.config';
import { InstancedProp, localMatrix, useDisposables, usePrefersReducedMotion, type PropPlacement } from '../primitives';
import { createRotorGeometry, createTowerGeometry } from './solarpunk-geometry';
import { createPanelTexture } from './solarpunk-textures';

const FLOOR = ENVIRONMENT_ROOM.FLOOR_Y;
const O = SOLARPUNK_OUTSIDE;
const NACELLE: Vec3 = [0.34, 0.3, 0.8];
const NACELLE_OFFSET = localMatrix([0, 0, 0.1]);
/** Rotor sits in front of the nacelle */
const ROTOR_FORWARD = 0.48;
/** Fixed starting angles so the rotors are not in lock-step */
const ROTOR_PHASE_STEP = 0.9;

const TOWERS: PropPlacement[] = O.TURBINES.map(([x, z, height, rot]) => ({
  position: [x, FLOOR, z],
  scale: [1, height, 1],
  rotationY: rot,
}));
const NACELLES: PropPlacement[] = O.TURBINES.map(([x, z, height, rot]) => ({
  position: [x, FLOOR + height, z],
  scale: NACELLE,
  rotationY: rot,
}));

/** Panel plate with the sun tilt baked in, so placements only need a yaw. */
function createPanelGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(O.PANEL_SIZE[0], O.PANEL_SIZE[1]);
  geometry.rotateX(-Math.PI / 2 + O.PANEL_TILT);
  return geometry;
}

interface PanelLayout {
  panels: PropPlacement[];
  legs: PropPlacement[];
}

/** Rows of tilted panels on short legs, rotated as a block around the array centre. */
function buildArrays(): PanelLayout {
  const panels: PropPlacement[] = [];
  const legs: PropPlacement[] = [];
  const [pw] = O.PANEL_SIZE;
  O.ARRAYS.forEach(([cx, cz, rows, cols, rot]) => {
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const place = (lx: number, lz: number): [number, number] => [cx + lx * cos + lz * sin, cz - lx * sin + lz * cos];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lx = (c - (cols - 1) / 2) * (pw + O.PANEL_GAP);
        const lz = (r - (rows - 1) / 2) * O.ROW_SPACING;
        const [x, z] = place(lx, lz);
        panels.push({ position: [x, FLOOR + O.PANEL_HEIGHT, z], rotationY: rot });
        const [legX, legZ] = place(lx, lz + 0.1);
        legs.push({ position: [legX, FLOOR + O.PANEL_HEIGHT / 2, legZ], scale: [0.06, O.PANEL_HEIGHT, 0.06], rotationY: rot });
      }
    }
  });
  return { panels, legs };
}

/** Spinning rotors: one shared geometry/material, a group per turbine. */
function Rotors({ geometry, material }: { geometry: THREE.BufferGeometry; material: THREE.Material }) {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const reducedMotion = usePrefersReducedMotion();
  useFrame((_, delta) => {
    if (reducedMotion) return;
    refs.current.forEach((mesh, i) => {
      if (mesh) mesh.rotation.z += delta * O.TURBINES[i][4];
    });
  });
  return (
    <group>
      {O.TURBINES.map(([x, z, height, rot], i) => (
        <group key={`${x},${z}`} position={[x, FLOOR + height, z]} rotation={[0, rot, 0]}>
          <mesh
            ref={(mesh) => {
              refs.current[i] = mesh;
            }}
            geometry={geometry}
            material={material}
            position={[0, 0, ROTOR_FORWARD]}
            rotation={[0, 0, i * ROTOR_PHASE_STEP]}
          />
        </group>
      ))}
    </group>
  );
}

/**
 * Outside the glass: slim white wind turbines on the meadow horizon and
 * solar arrays beside the greenhouse. Rotors stop for reduced motion.
 */
export function OutdoorEnergy() {
  const arrays = useMemo(() => buildArrays(), []);
  const assets = useMemo(() => {
    const panelMap = createPanelTexture();
    return {
      panelMap,
      tower: createTowerGeometry(),
      rotor: createRotorGeometry(O.BLADE_LENGTH),
      box: new THREE.BoxGeometry(1, 1, 1),
      plate: createPanelGeometry(),
      white: new THREE.MeshStandardMaterial({ color: SOLARPUNK_COLORS.turbine, roughness: 0.45 }),
      panel: new THREE.MeshStandardMaterial({ map: panelMap, roughness: 0.3, metalness: 0.2, side: THREE.DoubleSide }),
      steel: new THREE.MeshStandardMaterial({ color: SOLARPUNK_COLORS.panelFrame, roughness: 0.5, metalness: 0.4 }),
    };
  }, []);
  useDisposables(assets);

  return (
    <group>
      <InstancedProp geometry={assets.tower} material={assets.white} placements={TOWERS} />
      <InstancedProp geometry={assets.box} material={assets.white} placements={NACELLES} offset={NACELLE_OFFSET} />
      <Rotors geometry={assets.rotor} material={assets.white} />
      <InstancedProp geometry={assets.plate} material={assets.panel} placements={arrays.panels} />
      <InstancedProp geometry={assets.box} material={assets.steel} placements={arrays.legs} />
    </group>
  );
}
