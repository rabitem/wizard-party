'use client';

import type { ReactNode } from 'react';
import type * as THREE from 'three';
import { ENVIRONMENT_ROOM } from '@/presentation/config/themed-environment.config';
import { SceneFog } from './SceneFog';

interface RoomShellProps {
  fogColor: string;
  floorColor: string;
  wallColor: string;
  ceilingColor: string;
  /** Optional textured materials override the flat colours */
  floorMaterial?: THREE.Material;
  wallMaterial?: THREE.Material;
  ceilingMaterial?: THREE.Material;
  fogNear?: number;
  fogFar?: number;
  children?: ReactNode;
}

const { FLOOR_Y, HALF_WIDTH, HALF_DEPTH, HEIGHT } = ENVIRONMENT_ROOM;
const WALL_CENTER_Y = FLOOR_Y + HEIGHT / 2;

/** Wall transforms: back, left, right and front (behind the default camera). */
export const ROOM_WALLS: ReadonlyArray<{ id: string; position: [number, number, number]; rotationY: number; width: number }> = [
  { id: 'back', position: [0, WALL_CENTER_Y, -HALF_DEPTH], rotationY: 0, width: HALF_WIDTH * 2 },
  { id: 'left', position: [-HALF_WIDTH, WALL_CENTER_Y, 0], rotationY: Math.PI / 2, width: HALF_DEPTH * 2 },
  { id: 'right', position: [HALF_WIDTH, WALL_CENTER_Y, 0], rotationY: -Math.PI / 2, width: HALF_DEPTH * 2 },
  { id: 'front', position: [0, WALL_CENTER_Y, HALF_DEPTH], rotationY: Math.PI, width: HALF_WIDTH * 2 },
];

interface PanelProps {
  size: [number, number];
  position: [number, number, number];
  rotation: [number, number, number];
  material?: THREE.Material;
  color: string;
  roughness: number;
  receiveShadow?: boolean;
}

/** Flat plane that uses a shared material when given, else a flat colour. */
function Panel({ size, position, rotation, material, color, roughness, receiveShadow = false }: PanelProps) {
  if (material) {
    return (
      <mesh position={position} rotation={rotation} material={material} receiveShadow={receiveShadow}>
        <planeGeometry args={size} />
      </mesh>
    );
  }
  return (
    <mesh position={position} rotation={rotation} receiveShadow={receiveShadow}>
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
}

/**
 * Four walls, floor, ceiling and fog. Environments layer their own
 * architecture and props inside it (pass them as children).
 */
export function RoomShell({
  fogColor,
  floorColor,
  wallColor,
  ceilingColor,
  floorMaterial,
  wallMaterial,
  ceilingMaterial,
  fogNear = ENVIRONMENT_ROOM.FOG_NEAR,
  fogFar = ENVIRONMENT_ROOM.FOG_FAR,
  children,
}: RoomShellProps) {
  return (
    <group>
      <SceneFog color={fogColor} near={fogNear} far={fogFar} />

      <Panel
        size={[HALF_WIDTH * 2, HALF_DEPTH * 2]}
        position={[0, FLOOR_Y, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={floorMaterial}
        color={floorColor}
        roughness={0.85}
        receiveShadow
      />
      <Panel
        size={[HALF_WIDTH * 2, HALF_DEPTH * 2]}
        position={[0, FLOOR_Y + HEIGHT, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        material={ceilingMaterial}
        color={ceilingColor}
        roughness={0.95}
      />
      {ROOM_WALLS.map((wall) => (
        <Panel
          key={wall.id}
          size={[wall.width, HEIGHT]}
          position={wall.position}
          rotation={[0, wall.rotationY, 0]}
          material={wallMaterial}
          color={wallColor}
          roughness={0.9}
        />
      ))}

      {children}
    </group>
  );
}
