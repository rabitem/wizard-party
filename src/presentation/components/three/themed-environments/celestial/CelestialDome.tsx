'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CELESTIAL_COLORS, CELESTIAL_DOME } from '@/presentation/config/celestial-environment.config';
import { getGlowTexture, MatrixInstances, useDisposables, usePrefersReducedMotion } from '../primitives';
import { CelestialStarfield } from './CelestialStarfield';
import { createConstellationGeometries, createDomeGeometry, createRibMatrices } from './celestial-geometry';
import { createSkyTexture } from './celestial-textures';
import { createGoldMaterial } from './celestial-materials';

const RIB_TUBE = 0.07;
const BASE_RING_TUBE = 0.14;
const LINE_OPACITY = 0.55;
const STAR_OPACITY = 0.95;

/**
 * Observatory dome: a painted sky with the milky way, a deep GPU starfield
 * that twinkles, and gilded constellations that all slowly wheel overhead, framed by static gold ribs and a base ring.
 * Sky elements ignore fog so the dome stays crisp; reduced motion freezes it.
 */
export function CelestialDome() {
  const sky = useRef<THREE.Group>(null);
  const starPoints = useRef<THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>>(null);
  const lineSegments = useRef<THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>>(null);
  const reducedMotion = usePrefersReducedMotion();

  const assets = useMemo(() => {
    const skyMap = createSkyTexture();
    const { lines, stars } = createConstellationGeometries();
    return {
      skyMap,
      lines,
      stars,
      domeGeometry: createDomeGeometry(),
      ribGeometry: new THREE.TorusGeometry(CELESTIAL_DOME.RADIUS - RIB_TUBE, RIB_TUBE, 5, 40, Math.PI),
      baseRingGeometry: new THREE.TorusGeometry(CELESTIAL_DOME.RADIUS, BASE_RING_TUBE, 6, 64),
      dome: new THREE.MeshBasicMaterial({ map: skyMap, side: THREE.BackSide, fog: false }),
      line: new THREE.LineBasicMaterial({
        color: CELESTIAL_COLORS.constellation,
        transparent: true,
        opacity: LINE_OPACITY,
        fog: false,
        depthWrite: false,
      }),
      star: new THREE.PointsMaterial({
        color: CELESTIAL_COLORS.starWarm,
        map: getGlowTexture(),
        size: CELESTIAL_DOME.STAR_POINT_SIZE,
        sizeAttenuation: true,
        transparent: true,
        opacity: STAR_OPACITY,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        toneMapped: false,
      }),
      gold: createGoldMaterial({ emissiveIntensity: 0.35, roughness: 0.35 }),
    };
  }, []);
  useDisposables(assets);

  const ribMatrices = useMemo(() => createRibMatrices(CELESTIAL_DOME.RIB_COUNT, CELESTIAL_DOME.BASE_Y), []);

  useFrame(({ clock }, delta) => {
    if (reducedMotion || !sky.current) return;
    sky.current.rotation.y += delta * CELESTIAL_DOME.ROTATION_SPEED;
    // Gentle twinkle on the constellation stars and a breathing glow on the lines
    const t = clock.getElapsedTime() * CELESTIAL_DOME.TWINKLE_SPEED;
    if (starPoints.current) starPoints.current.material.opacity = STAR_OPACITY * (0.8 + 0.2 * Math.sin(t));
    if (lineSegments.current) lineSegments.current.material.opacity = LINE_OPACITY * (0.85 + 0.15 * Math.sin(t * 0.5 + 1));
  });

  return (
    <group>
      <group ref={sky} position={[0, CELESTIAL_DOME.BASE_Y, 0]}>
        <mesh geometry={assets.domeGeometry} material={assets.dome} scale={[1, CELESTIAL_DOME.Y_SCALE, 1]} />
        <lineSegments ref={lineSegments} geometry={assets.lines} material={assets.line} />
        <points ref={starPoints} geometry={assets.stars} material={assets.star} />
        <CelestialStarfield />
      </group>
      <MatrixInstances geometry={assets.ribGeometry} material={assets.gold} matrices={ribMatrices} />
      <mesh
        geometry={assets.baseRingGeometry}
        material={assets.gold}
        position={[0, CELESTIAL_DOME.BASE_Y, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
    </group>
  );
}
