'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HALLOWEEN_COBWEBS, HALLOWEEN_COLORS, HALLOWEEN_LAYOUT } from '@/presentation/config/halloween-environment.config';
import { InstancedProp, seededRandom, useDisposables, usePrefersReducedMotion, type PropPlacement } from '../primitives';
import { createCobwebGeometry, createCobwebMaterial, createCobwebTexture } from './cobweb';

const WING_FLAP_SPEED = 14;
const WING_FLAP_ANGLE = 0.7;
const BAT_ORBIT_SPEED = 0.12;

/** Scalloped bat wing (right wing; mirrored for the left). */
function createWingGeometry(): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.02);
  shape.quadraticCurveTo(0.2, 0.16, 0.42, 0.08);
  shape.quadraticCurveTo(0.36, 0.0, 0.32, -0.04);
  shape.quadraticCurveTo(0.26, 0.02, 0.2, -0.05);
  shape.quadraticCurveTo(0.14, 0.0, 0.08, -0.05);
  shape.quadraticCurveTo(0.04, -0.01, 0, -0.03);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape, 6);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

interface BatState {
  id: string;
  angle: number;
  radius: number;
  height: number;
  speed: number;
  phase: number;
}

/** Bats circling under the rafters with flapping wings and a gentle bob. */
function Bats() {
  const reducedMotion = usePrefersReducedMotion();
  const batRefs = useRef<Array<THREE.Group | null>>([]);
  const wingRefs = useRef<Array<[THREE.Mesh | null, THREE.Mesh | null]>>([]);
  const { center, radius, bob } = HALLOWEEN_LAYOUT.BAT_AREA;

  const assets = useMemo(
    () => ({
      wing: createWingGeometry(),
      body: new THREE.SphereGeometry(0.07, 8, 6),
      material: new THREE.MeshStandardMaterial({ color: HALLOWEEN_COLORS.bat, roughness: 0.9, side: THREE.DoubleSide }),
    }),
    [],
  );
  useDisposables(assets);

  const bats = useMemo<BatState[]>(() => {
    const rand = seededRandom(77);
    return Array.from({ length: HALLOWEEN_LAYOUT.BAT_COUNT }, (_, i) => ({
      id: `bat-${i}`,
      angle: rand() * Math.PI * 2,
      radius: radius * (0.55 + rand() * 0.45),
      height: center[1] + (rand() - 0.5) * 1.6,
      speed: BAT_ORBIT_SPEED * (0.7 + rand() * 0.8) * (rand() > 0.3 ? 1 : -1),
      phase: rand() * Math.PI * 2,
    }));
  }, [center, radius]);

  useFrame(({ clock }) => {
    const time = reducedMotion ? 0 : clock.getElapsedTime();
    bats.forEach((bat, index) => {
      const group = batRefs.current[index];
      if (!group) return;
      const angle = bat.angle + time * bat.speed;
      group.position.set(
        center[0] + Math.cos(angle) * bat.radius,
        bat.height + Math.sin(time * 1.3 + bat.phase) * bob,
        center[2] + Math.sin(angle) * bat.radius * 0.6,
      );
      group.rotation.y = -angle + (bat.speed > 0 ? 0 : Math.PI);
      const flap = reducedMotion ? 0.2 : Math.sin(time * WING_FLAP_SPEED + bat.phase) * WING_FLAP_ANGLE;
      const [left, right] = wingRefs.current[index] ?? [null, null];
      if (right) right.rotation.z = flap;
      if (left) left.rotation.z = -flap;
    });
  });

  return (
    <group>
      {bats.map((bat, index) => (
        <group
          key={bat.id}
          ref={(group) => {
            batRefs.current[index] = group;
          }}
        >
          <mesh geometry={assets.body} material={assets.material} scale={[1, 0.9, 1.4]} />
          <mesh
            geometry={assets.wing}
            material={assets.material}
            ref={(mesh) => {
              wingRefs.current[index] = [wingRefs.current[index]?.[0] ?? null, mesh];
            }}
          />
          <mesh
            geometry={assets.wing}
            material={assets.material}
            scale={[-1, 1, 1]}
            ref={(mesh) => {
              wingRefs.current[index] = [mesh, wingRefs.current[index]?.[1] ?? null];
            }}
          />
        </group>
      ))}
    </group>
  );
}

const COBWEB_PLACEMENTS: PropPlacement[] = HALLOWEEN_COBWEBS.map(([x, y, z, rotationY, scale]) => ({
  position: [x, y, z],
  rotationY,
  scale,
}));

/** Translucent dusty cobwebs in the ceiling corners and above the shelves (one instanced draw). */
function Cobwebs() {
  const assets = useMemo(() => {
    const map = createCobwebTexture();
    return { map, geometry: createCobwebGeometry(), material: createCobwebMaterial(map) };
  }, []);
  useDisposables(assets);

  return <InstancedProp geometry={assets.geometry} material={assets.material} placements={COBWEB_PLACEMENTS} />;
}

export function HalloweenCreatures() {
  return (
    <group>
      <Bats />
      <Cobwebs />
    </group>
  );
}
