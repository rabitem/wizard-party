'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CELESTIAL_PLANET_MOTION as M, CELESTIAL_PLANETS } from '@/presentation/config/celestial-environment.config';
import { useDisposables, usePrefersReducedMotion } from '../primitives';
import { createPlanetBandTexture, createRingTexture } from './celestial-textures';

const RINGED = CELESTIAL_PLANETS.filter((planet) => planet.ring);
const scratch = new THREE.Object3D();
const scratchColor = new THREE.Color();

/**
 * Banded planets hovering above the room, some with dusty rings. Two
 * instanced draws (spheres + rings) animated from one frame callback; frozen
 * for reduced-motion users.
 */
export function FloatingPlanets() {
  const planetsRef = useRef<THREE.InstancedMesh>(null);
  const ringsRef = useRef<THREE.InstancedMesh>(null);
  const reducedMotion = usePrefersReducedMotion();

  const assets = useMemo(() => {
    const bandMap = createPlanetBandTexture();
    const ringMap = createRingTexture();
    return {
      bandMap,
      ringMap,
      sphere: new THREE.SphereGeometry(1, 24, 16),
      ring: new THREE.RingGeometry(M.RING_INNER, M.RING_OUTER, 48, 1),
      planet: new THREE.MeshStandardMaterial({ map: bandMap, roughness: 0.75, emissive: '#1a1440', emissiveIntensity: 0.5 }),
      ringMaterial: new THREE.MeshBasicMaterial({
        map: ringMap,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    };
  }, []);
  useDisposables(assets);

  const update = (time: number) => {
    const planets = planetsRef.current;
    const rings = ringsRef.current;
    if (!planets) return;
    let ringIndex = 0;
    CELESTIAL_PLANETS.forEach((planet, i) => {
      const [x, y, z] = planet.position;
      const bobY = y + Math.sin(time * M.BOB_SPEED + planet.phase) * M.BOB;
      scratch.position.set(x, bobY, z);
      scratch.rotation.set(0.2, time * M.SPIN + planet.phase, 0);
      scratch.scale.setScalar(planet.radius);
      scratch.updateMatrix();
      planets.setMatrixAt(i, scratch.matrix);
      if (planet.ring && rings) {
        scratch.rotation.set(-Math.PI / 2 + planet.ring.tilt[0], 0, planet.ring.tilt[1]);
        scratch.updateMatrix();
        rings.setMatrixAt(ringIndex++, scratch.matrix);
      }
    });
    planets.instanceMatrix.needsUpdate = true;
    if (rings) rings.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    CELESTIAL_PLANETS.forEach((planet, i) => planetsRef.current?.setColorAt(i, scratchColor.set(planet.color)));
    RINGED.forEach((planet, i) => ringsRef.current?.setColorAt(i, scratchColor.set(planet.ring?.color ?? '#ffffff')));
    for (const mesh of [planetsRef.current, ringsRef.current]) {
      if (mesh?.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    update(0);
  }, [assets]);

  useFrame(({ clock }) => {
    if (!reducedMotion) update(clock.getElapsedTime());
  });

  return (
    <group>
      <instancedMesh ref={planetsRef} args={[assets.sphere, assets.planet, CELESTIAL_PLANETS.length]} frustumCulled={false} />
      {RINGED.length > 0 && (
        <instancedMesh ref={ringsRef} args={[assets.ring, assets.ringMaterial, RINGED.length]} frustumCulled={false} />
      )}
    </group>
  );
}
