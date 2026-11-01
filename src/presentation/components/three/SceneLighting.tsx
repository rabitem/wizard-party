'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';
import type * as THREE from 'three';
import { SCENE_LIGHTING } from '@/presentation/config/scene-lighting.config';
import { useRenderScheduler } from './frame-scheduling';
import { useRenderQuality } from './render-quality';

const { key, fill, rim, tableSpot, hemisphere, ambient } = SCENE_LIGHTING;

/**
 * three.js allocates a light's shadow map once, so a new size disposes the old target and the
 * next shadow render re-creates it. Returns whether anything changed.
 */
function resizeShadowMap(light: THREE.DirectionalLight | null, size: number): boolean {
  const shadow = light?.shadow;
  if (!shadow || (shadow.mapSize.x === size && shadow.mapSize.y === size)) return false;
  shadow.mapSize.set(size, size);
  shadow.map?.dispose();
  shadow.map = null;
  return true;
}

/** Resizes the key light's shadow map when the quality tier changes. */
function useShadowMapSize(lightRef: RefObject<THREE.DirectionalLight | null>, size: number) {
  const scheduler = useRenderScheduler();
  useLayoutEffect(() => {
    if (resizeShadowMap(lightRef.current, size)) scheduler.requestShadowUpdate();
  }, [lightRef, size, scheduler]);
}

/**
 * Table lighting within the light budget of scene-lighting.config.ts: one shadow caster, and the
 * fill and rim lights only on tiers that afford them (folded into the hemisphere light otherwise).
 */
export function SceneLighting() {
  const { profile } = useRenderQuality();
  const keyRef = useRef<THREE.DirectionalLight>(null);
  useShadowMapSize(keyRef, profile.shadowMapSize);
  const hemisphereIntensity = hemisphere.intensity + (profile.fillLights ? 0 : hemisphere.fillFallbackHemisphereBoost);

  return (
    <>
      {/* Low ambient lighting preserves contact shadows and material depth. */}
      <ambientLight intensity={ambient.intensity} color={ambient.color} />

      <hemisphereLight args={[hemisphere.skyColor, hemisphere.groundColor, hemisphereIntensity]} position={[0, 10, 0]} />

      {/* Key light - warm, dramatic, the scene's only shadow caster */}
      <directionalLight
        ref={keyRef}
        position={key.position}
        intensity={key.intensity}
        color={key.color}
        castShadow={profile.shadows}
        shadow-camera-far={key.shadowCameraFar}
        shadow-camera-left={-key.shadowCameraSize}
        shadow-camera-right={key.shadowCameraSize}
        shadow-camera-top={key.shadowCameraSize}
        shadow-camera-bottom={-key.shadowCameraSize}
        shadow-bias={key.shadowBias}
        shadow-normalBias={key.shadowNormalBias}
        shadow-radius={key.shadowRadius}
      />

      {profile.fillLights ? (
        <>
          {/* Fill light - cooler, softer */}
          <directionalLight position={fill.position} intensity={fill.intensity} color={fill.color} />
          {/* Rim light for depth separation */}
          <directionalLight position={rim.position} intensity={rim.intensity} color={rim.color} />
        </>
      ) : null}

      {/* Overhead table spotlight (no shadow: the key light already shades the table) */}
      <spotLight
        position={tableSpot.position}
        angle={tableSpot.angle}
        penumbra={tableSpot.penumbra}
        intensity={tableSpot.intensity}
        color={tableSpot.color}
        distance={tableSpot.distance}
        decay={tableSpot.decay}
      />

      <color attach="background" args={[SCENE_LIGHTING.background]} />
    </>
  );
}
