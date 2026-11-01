'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NEON_REALISM } from '@/presentation/config/neon-environment.config';
import type { Vec3 } from '@/presentation/config/themed-environment.config';
import { useDisposables, usePrefersReducedMotion } from '../primitives';
import { shaderUniforms } from '../primitives/realism';
import { AIRCRAFT_FRAGMENT_SHADER, AIRCRAFT_VERTEX_SHADER } from './neon-shaders';
import { BEACON_POSITIONS } from './skyline-layout';

const { AIRCRAFT } = NEON_REALISM;
const FROZEN_TIME = 6;
const GOLDEN = 0.618;

interface LightPoint {
  position: Vec3;
  velocity?: Vec3;
  loop?: readonly [number, number];
  blink?: readonly [number, number, number, number];
  color: string;
  size: number;
}

/** Tower beacons (slow red pulse) plus strobe + nav lights for each plane. */
function buildLights(): LightPoint[] {
  const { BEACON, STROBE } = AIRCRAFT;
  const lights: LightPoint[] = BEACON_POSITIONS.map((position, i) => ({
    position,
    blink: [BEACON.period, (i * GOLDEN) % 1, BEACON.duty, BEACON.floor],
    color: BEACON.color,
    size: BEACON.size,
  }));
  AIRCRAFT.PLANES.forEach((plane, i) => {
    const [vx, , vz] = plane.velocity;
    const length = Math.hypot(vx, vz) || 1;
    // Wing direction: horizontal, perpendicular to the flight path
    const wing: Vec3 = [(-vz / length) * AIRCRAFT.WING, 0, (vx / length) * AIRCRAFT.WING];
    const loop = [plane.loop, plane.offset] as const;
    const at = (side: number): Vec3 => [plane.start[0] + wing[0] * side, plane.start[1], plane.start[2] + wing[2] * side];
    lights.push(
      { position: plane.start, velocity: plane.velocity, loop, blink: [STROBE.period, (i * GOLDEN) % 1, STROBE.duty, 0], color: STROBE.color, size: STROBE.size },
      { position: at(-1), velocity: plane.velocity, loop, color: AIRCRAFT.NAV_COLORS[0], size: AIRCRAFT.NAV_SIZE },
      { position: at(1), velocity: plane.velocity, loop, color: AIRCRAFT.NAV_COLORS[1], size: AIRCRAFT.NAV_SIZE },
    );
  });
  return lights;
}

function createAircraftGeometry(): THREE.BufferGeometry {
  const lights = buildLights();
  const geometry = new THREE.BufferGeometry();
  const color = new THREE.Color();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(lights.flatMap((l) => l.position), 3));
  geometry.setAttribute('aVelocity', new THREE.Float32BufferAttribute(lights.flatMap((l) => l.velocity ?? [0, 0, 0]), 3));
  geometry.setAttribute('aLoop', new THREE.Float32BufferAttribute(lights.flatMap((l) => l.loop ?? [0, 0]), 2));
  geometry.setAttribute('aBlink', new THREE.Float32BufferAttribute(lights.flatMap((l) => l.blink ?? [0, 0, 1, 1]), 4));
  geometry.setAttribute('aColor', new THREE.Float32BufferAttribute(lights.flatMap((l) => color.set(l.color).toArray()), 3));
  geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(lights.map((l) => l.size), 1));
  return geometry;
}

/**
 * Blinking aviation beacons on the tallest towers and a few planes drifting
 * across the night sky with strobes and red/green nav lights. One point
 * draw call; motion and blinking live in the vertex shader. Reduced motion
 * freezes the planes and keeps the beacons steady.
 */
export function AircraftLights() {
  const reducedMotion = usePrefersReducedMotion();
  const ref = useRef<THREE.Points>(null);
  const assets = useMemo(
    () => ({
      geometry: createAircraftGeometry(),
      material: new THREE.ShaderMaterial({
        vertexShader: AIRCRAFT_VERTEX_SHADER,
        fragmentShader: AIRCRAFT_FRAGMENT_SHADER,
        uniforms: { uTime: { value: FROZEN_TIME }, uPixelRatio: { value: 1 }, uSteady: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    }),
    [],
  );
  useDisposables(assets);

  useFrame((state) => {
    const u = shaderUniforms(ref.current);
    if (!u) return;
    u.uPixelRatio.value = state.viewport.dpr;
    u.uSteady.value = reducedMotion ? 1 : 0;
    u.uTime.value = reducedMotion ? FROZEN_TIME : state.clock.getElapsedTime();
  });

  return <points ref={ref} geometry={assets.geometry} material={assets.material} frustumCulled={false} />;
}
