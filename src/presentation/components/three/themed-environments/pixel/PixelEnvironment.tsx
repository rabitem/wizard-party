'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PIXEL_COLORS, PIXEL_FOG, PIXEL_LIGHTS, PIXEL_REALISM } from '@/presentation/config/pixel-environment.config';
import { addSurfaceDetail, RoomShell, useDisposables, useFlicker } from '../primitives';
import { ArcadeCabinets } from './ArcadeCabinets';
import { ArcadeDust } from './ArcadeDust';
import { PixelTableDecor } from './PixelTableDecor';
import { createCheckerFloor, createStarWallpaper } from './pixel-textures';
import { PrizeCounter } from './PrizeCounter';
import { StarfieldWindows } from './StarfieldWindows';
import { VoxelDecor } from './VoxelDecor';

/** Self-lit share of the wallpaper so its pixel stars read in the dim hall */
const WALL_EMISSIVE = 0.45;
const { FLOOR } = PIXEL_REALISM;

/**
 * Pixel Arcade: an 8-bit arcade hall. Star-pixel wallpaper over a polished
 * checkered floor, space windows onto a twinkling parallax pixel starfield,
 * rows of cabinets with blooming CRT mini-game screens reflected on the
 * floor, a prize counter with spinning coins, voxel mushrooms and bonus
 * blocks, neon wall stripes and dust motes drifting in the screen light.
 * Lights: hemisphere fill plus three point lights (warm key over the table,
 * magenta and cyan screen spill), no shadows; exposure and bloom come from
 * realism-atmosphere.config.ts.
 */
export function PixelEnvironment() {
  const accentLight = useRef<THREE.PointLight>(null);
  const assets = useMemo(() => {
    const wallpaper = createStarWallpaper();
    const floorTexture = createCheckerFloor();
    return {
      wallpaper,
      floorTexture,
      wall: new THREE.MeshStandardMaterial({
        map: wallpaper,
        emissiveMap: wallpaper,
        emissive: '#ffffff',
        emissiveIntensity: WALL_EMISSIVE,
        roughness: 0.9,
      }),
      // Polished arcade floor: low roughness with fine wear so lights and screens glint on it
      floor: addSurfaceDetail(
        new THREE.MeshStandardMaterial({ map: floorTexture, roughness: FLOOR.ROUGHNESS, metalness: FLOOR.METALNESS }),
        { scale: FLOOR.DETAIL_SCALE, normalStrength: FLOOR.NORMAL_STRENGTH },
      ),
    };
  }, []);
  useDisposables(assets);

  const { key, accent, spill, hemisphereIntensity, pulseAmplitude } = PIXEL_LIGHTS;
  const flickerTargets = useMemo(
    () => [{ light: accentLight, base: accent.intensity, amplitude: pulseAmplitude, phase: 1.3 }],
    [accent.intensity, pulseAmplitude],
  );
  useFlicker(flickerTargets);

  return (
    <RoomShell
      fogColor={PIXEL_COLORS.fog}
      floorColor={PIXEL_COLORS.floorA}
      wallColor={PIXEL_COLORS.wallBase}
      ceilingColor={PIXEL_COLORS.ceiling}
      floorMaterial={assets.floor}
      wallMaterial={assets.wall}
      fogNear={PIXEL_FOG.NEAR}
      fogFar={PIXEL_FOG.FAR}
    >
      <hemisphereLight args={[PIXEL_COLORS.hemisphereSky, PIXEL_COLORS.hemisphereGround, hemisphereIntensity]} position={[0, 10, 0]} />
      <pointLight position={key.position} color={key.color} intensity={key.intensity} distance={key.distance} decay={2} />
      <pointLight
        ref={accentLight}
        position={accent.position}
        color={accent.color}
        intensity={accent.intensity}
        distance={accent.distance}
        decay={2}
      />
      <pointLight position={spill.position} color={spill.color} intensity={spill.intensity} distance={spill.distance} decay={2} />

      <StarfieldWindows />
      <ArcadeCabinets />
      <PrizeCounter />
      <VoxelDecor />
      <PixelTableDecor />
      <ArcadeDust />
    </RoomShell>
  );
}
