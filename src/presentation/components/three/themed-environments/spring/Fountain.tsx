'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SPRING_COLORS, SPRING_LAYOUT, SPRING_REALISM } from '@/presentation/config/spring-environment.config';
import { addSurfaceDetail, useDisposables, usePrefersReducedMotion } from '../primitives';
import { useShaderTime } from '../solarpunk/useShaderTime';
import { createCausticsMaterial, createWaterSurfaceMaterial } from '../solarpunk/water-materials';
import { FountainSpray } from './FountainSpray';

const BASIN = { RADIUS: 1.5, HEIGHT: 0.5, WALL: 0.16, WATER_Y: 0.4 } as const;
const PEDESTAL = { RADIUS: 0.16, HEIGHT: 1.15 } as const;
const BOWL = { RADIUS: 0.62, HEIGHT: 0.18, WATER_Y: 0.13 } as const;
const JET = { RADIUS: 0.05, HEIGHT: 0.55 } as const;
const SPILL = { HEIGHT: PEDESTAL.HEIGHT + BOWL.HEIGHT - BASIN.WATER_Y } as const;
const CAUSTIC_Y = 0.04;
const SEGMENTS = 24;
const [FX, , FZ] = SPRING_LAYOUT.FOUNTAIN_POSITION;
/** Morning sun behind the fountain (glints face the camera side) */
const SUN_DIRECTION = [-0.3, 0.55, -0.8] as const;

/** Basin profile for a lathe: outer wall, rim and inner floor. */
function basinProfile(radius: number, height: number, wall: number): THREE.Vector2[] {
  return [
    new THREE.Vector2(0, 0.02),
    new THREE.Vector2(radius - wall, 0.02),
    new THREE.Vector2(radius - wall, height),
    new THREE.Vector2(radius + 0.04, height),
    new THREE.Vector2(radius + 0.04, height - 0.08),
    new THREE.Vector2(radius, height - 0.1),
    new THREE.Vector2(radius, 0),
  ];
}

/**
 * Two-tier stone fountain: a basin of shader water (radial ripples, fresnel
 * sky reflection, sun glints) over dancing caustics, a pedestal bowl
 * spilling a translucent curtain, a bubbling jet and GPU splash droplets.
 */
export function Fountain() {
  const jetRef = useRef<THREE.Mesh>(null);
  const basinWaterRef = useRef<THREE.Mesh>(null);
  const bowlWaterRef = useRef<THREE.Mesh>(null);
  const causticRef = useRef<THREE.Mesh>(null);
  const reducedMotion = usePrefersReducedMotion();

  const assets = useMemo(() => {
    const disc = new THREE.CircleGeometry(1, SEGMENTS * 2);
    disc.rotateX(-Math.PI / 2);
    const square = new THREE.PlaneGeometry(2, 2);
    square.rotateX(-Math.PI / 2);
    const jet = new THREE.CylinderGeometry(JET.RADIUS * 0.4, JET.RADIUS, JET.HEIGHT, 6);
    jet.translate(0, JET.HEIGHT / 2, 0);
    const waterOptions = { ...SPRING_REALISM.WATER, center: [FX, FZ] as const, scale: 3, flow: 0.12, sunDirection: SUN_DIRECTION };
    return {
      disc,
      square,
      jet,
      basin: new THREE.LatheGeometry(basinProfile(BASIN.RADIUS, BASIN.HEIGHT, BASIN.WALL), SEGMENTS),
      bowl: new THREE.LatheGeometry(basinProfile(BOWL.RADIUS, BOWL.HEIGHT, 0.06), SEGMENTS),
      pedestal: new THREE.CylinderGeometry(PEDESTAL.RADIUS, PEDESTAL.RADIUS * 1.6, PEDESTAL.HEIGHT, 12),
      spill: new THREE.CylinderGeometry(BOWL.RADIUS + 0.03, BOWL.RADIUS + 0.12, SPILL.HEIGHT, SEGMENTS, 1, true),
      stone: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: SPRING_COLORS.column, roughness: 0.75, side: THREE.DoubleSide }), { scale: 3, normalStrength: 0.35 }),
      basinWater: createWaterSurfaceMaterial({ ...waterOptions, radial: 1 }),
      bowlWater: createWaterSurfaceMaterial({ ...waterOptions, radial: 0.6 }),
      caustics: createCausticsMaterial({ ...SPRING_REALISM.CAUSTICS, scale: 3.2, edge: 0.2 }),
      curtain: new THREE.MeshBasicMaterial({ color: SPRING_COLORS.waterFoam, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }),
    };
  }, []);
  useDisposables(assets);
  useShaderTime([basinWaterRef, bowlWaterRef, causticRef]);

  useFrame(({ clock }) => {
    if (reducedMotion || !jetRef.current) return;
    const time = clock.getElapsedTime();
    jetRef.current.scale.y = 1 + Math.sin(time * 6) * 0.12 + Math.sin(time * 11) * 0.06;
  });

  const bowlY = PEDESTAL.HEIGHT;
  const innerRadius = BASIN.RADIUS - BASIN.WALL;
  return (
    <group position={SPRING_LAYOUT.FOUNTAIN_POSITION}>
      <mesh geometry={assets.basin} material={assets.stone} />
      <mesh ref={causticRef} position={[0, CAUSTIC_Y, 0]} scale={innerRadius} geometry={assets.square} material={assets.caustics} />
      <mesh ref={basinWaterRef} position={[0, BASIN.WATER_Y, 0]} scale={innerRadius} geometry={assets.disc} material={assets.basinWater} renderOrder={2} />

      <mesh position={[0, PEDESTAL.HEIGHT / 2, 0]} geometry={assets.pedestal} material={assets.stone} />
      <group position={[0, bowlY, 0]}>
        <mesh geometry={assets.bowl} material={assets.stone} />
        <mesh ref={bowlWaterRef} position={[0, BOWL.WATER_Y, 0]} scale={BOWL.RADIUS - 0.06} geometry={assets.disc} material={assets.bowlWater} renderOrder={2} />
        <mesh position={[0, BOWL.HEIGHT - SPILL.HEIGHT / 2, 0]} geometry={assets.spill} material={assets.curtain} />
        <mesh ref={jetRef} position={[0, BOWL.WATER_Y, 0]} geometry={assets.jet} material={assets.curtain} />
      </group>

      <FountainSpray
        jetY={bowlY + BOWL.WATER_Y + JET.HEIGHT * 0.85}
        rimRadius={BOWL.RADIUS + 0.06}
        rimY={bowlY + BOWL.HEIGHT}
        basinY={BASIN.WATER_Y}
        splashRadius={BOWL.RADIUS + 0.1}
      />
    </group>
  );
}
