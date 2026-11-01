'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { HALLOWEEN_COLORS, HALLOWEEN_LAYOUT } from '@/presentation/config/halloween-environment.config';
import {
  addSurfaceDetail,
  CandleCluster,
  createPbrMaterial,
  InstancedProp,
  localMatrix,
  PumpkinPatch,
  useDisposables,
} from '../primitives';
import {
  createGravestoneGeometry,
  createSkullGeometries,
  GRAVESTONE_PLACEMENTS,
  MANOR_CANDLES,
  MANOR_PUMPKINS,
  SHELF,
  SHELF_PLACEMENTS,
  SKULL_PLACEMENTS,
  SKULL_SOCKET_OFFSETS,
} from './halloween-props';

const SOCKET_OFFSETS = SKULL_SOCKET_OFFSETS.map((offset, i) => ({ id: `socket-${i}`, matrix: localMatrix(offset) }));
const BRACKET_OFFSETS = [-1, 1].map((side) => ({
  id: `bracket-${side}`,
  matrix: localMatrix([side * (HALLOWEEN_LAYOUT.SHELF_WIDTH / 2 - 0.3), -SHELF.BRACKET / 2, -SHELF.DEPTH / 4]),
}));

function usePropAssets() {
  const geometries = useMemo(() => {
    const skull = createSkullGeometries();
    return {
      gravestone: createGravestoneGeometry(),
      shelf: new THREE.BoxGeometry(HALLOWEEN_LAYOUT.SHELF_WIDTH, SHELF.THICKNESS, SHELF.DEPTH),
      bracket: new THREE.BoxGeometry(0.08, SHELF.BRACKET, SHELF.DEPTH / 2),
      ...skull,
    };
  }, []);
  const materials = useMemo(
    () => ({
      // Weathered granite: fine noise relief instead of block texture (one carved slab per headstone).
      stone: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: HALLOWEEN_COLORS.gravestone, roughness: 1 }), {
        scale: 2,
        normalStrength: 0.7,
      }),
      wood: createPbrMaterial('wood', {
        color: HALLOWEEN_COLORS.wood,
        accent: HALLOWEEN_COLORS.woodDark,
        seed: 9,
        repeat: [1, 0.5],
        roughness: 0.85,
      }),
      bone: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: HALLOWEEN_COLORS.bone, roughness: 0.75 }), {
        scale: 5,
        normalStrength: 0.3,
      }),
      moss: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: HALLOWEEN_COLORS.moss, roughness: 1 }), {
        scale: 3,
        normalStrength: 0.8,
      }),
      socket: new THREE.MeshBasicMaterial({ color: '#050307' }),
    }),
    [],
  );
  useDisposables(geometries);
  useDisposables(materials);
  return { geometries, materials };
}

/** Moss mounds at the foot of each gravestone. */
function GraveMounds({ material }: { material: THREE.Material }) {
  return (
    <group>
      {GRAVESTONE_PLACEMENTS.map((grave) => (
        <mesh
          key={`mound-${grave.position.join('-')}`}
          position={[grave.position[0], grave.position[1], grave.position[2] + 0.35]}
          scale={[0.6, 0.12, 0.45]}
          material={material}
        >
          <sphereGeometry args={[1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Static Haunted Manor props: jack-o'-lanterns, candles, wall shelves,
 * a little graveyard corner and skulls. Everything is instanced.
 */
export function HalloweenProps() {
  const { geometries, materials } = usePropAssets();

  return (
    <group>
      <PumpkinPatch
        pumpkins={MANOR_PUMPKINS}
        skinColor={HALLOWEEN_COLORS.pumpkin}
        faceColor={HALLOWEEN_COLORS.faceGlow}
        glowColor={HALLOWEEN_COLORS.pumpkinGlow}
      />
      <CandleCluster candles={MANOR_CANDLES} waxColor={HALLOWEEN_COLORS.candleWax} />

      <InstancedProp geometry={geometries.shelf} material={materials.wood} placements={SHELF_PLACEMENTS} />
      {BRACKET_OFFSETS.map((offset) => (
        <InstancedProp
          key={offset.id}
          geometry={geometries.bracket}
          material={materials.wood}
          placements={SHELF_PLACEMENTS}
          offset={offset.matrix}
        />
      ))}

      <InstancedProp geometry={geometries.gravestone} material={materials.stone} placements={GRAVESTONE_PLACEMENTS} />
      <GraveMounds material={materials.moss} />

      <InstancedProp geometry={geometries.cranium} material={materials.bone} placements={SKULL_PLACEMENTS} />
      <InstancedProp geometry={geometries.jaw} material={materials.bone} placements={SKULL_PLACEMENTS} />
      {SOCKET_OFFSETS.map((offset) => (
        <InstancedProp
          key={offset.id}
          geometry={geometries.socket}
          material={materials.socket}
          placements={SKULL_PLACEMENTS}
          offset={offset.matrix}
        />
      ))}
    </group>
  );
}
