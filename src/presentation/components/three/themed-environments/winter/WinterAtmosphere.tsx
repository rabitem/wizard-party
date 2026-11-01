'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import {
  WINTER_ATMOSPHERE_FX,
  WINTER_MELT,
  WINTER_MOON_SHAFTS,
  WINTER_SNOWFALL,
} from '@/presentation/config/winter-porch.config';
import { LightShafts, RealisticParticleField, SoftGroundFog, useDisposables, type LightShaft } from '../primitives';
import { createMeltTexture } from './winter-textures';

const SHAFTS: readonly LightShaft[] = WINTER_MOON_SHAFTS;
const { FAR, NEAR, BLOW_IN } = WINTER_SNOWFALL;

/** Heavy snowfall behind the archway (two depth fields) plus a light flurry gusting inside. */
function PorchSnowfall() {
  return (
    <group>
      <RealisticParticleField
        kind="snow"
        volume={FAR.volume}
        count={FAR.count}
        sizeScale={FAR.sizeScale}
        seed={FAR.seed}
        wind={WINTER_SNOWFALL.WIND}
        gust={WINTER_SNOWFALL.GUST}
        fallSpeed={WINTER_SNOWFALL.FALL_SPEED}
        clearRadius={0}
      />
      <RealisticParticleField
        kind="snow"
        volume={NEAR.volume}
        count={NEAR.count}
        sizeScale={NEAR.sizeScale}
        seed={NEAR.seed}
        wind={WINTER_SNOWFALL.WIND}
        gust={WINTER_SNOWFALL.GUST}
        fallSpeed={WINTER_SNOWFALL.FALL_SPEED * 1.1}
        clearRadius={0}
      />
      <RealisticParticleField
        kind="snow"
        volume={BLOW_IN.volume}
        count={BLOW_IN.count}
        sizeScale={BLOW_IN.sizeScale}
        seed={BLOW_IN.seed}
        wind={WINTER_SNOWFALL.BLOW_IN_WIND}
        gust={WINTER_SNOWFALL.GUST}
        fallSpeed={WINTER_SNOWFALL.FALL_SPEED * 0.7}
        opacity={0.8}
      />
    </group>
  );
}

/** Wet boot prints and meltwater on the planks inside the archway: dark, glossy, alpha-masked decal. */
function MeltDecal() {
  const assets = useMemo(() => {
    const mask = createMeltTexture();
    return {
      mask,
      material: new THREE.MeshStandardMaterial({
        color: WINTER_MELT.COLOR,
        alphaMap: mask,
        transparent: true,
        opacity: WINTER_MELT.OPACITY,
        roughness: WINTER_MELT.ROUGHNESS,
        metalness: 0,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    };
  }, []);
  useDisposables(assets);
  return (
    <mesh position={WINTER_MELT.CENTER} rotation={[-Math.PI / 2, 0, 0]} material={assets.material}>
      <planeGeometry args={WINTER_MELT.SIZE} />
    </mesh>
  );
}

/**
 * Winter realism layers: snowfall, a cold moonlight shaft with glittering
 * ice crystals, cold mist rolling in at the threshold, blowing-snow haze in
 * the yard and meltwater footprints on the floor.
 */
export function WinterAtmosphere() {
  const { MOON_SHAFT, SHAFT_DUST, DOOR_MIST, YARD_MIST } = WINTER_ATMOSPHERE_FX;
  return (
    <group>
      <PorchSnowfall />
      <LightShafts shafts={SHAFTS} color={MOON_SHAFT.color} intensity={MOON_SHAFT.intensity} dust={SHAFT_DUST} dustCount={MOON_SHAFT.dustCount} />
      <SoftGroundFog center={DOOR_MIST.center} size={DOOR_MIST.size} height={DOOR_MIST.height} color={DOOR_MIST.color} opacity={DOOR_MIST.opacity} speed={1.6} />
      <SoftGroundFog center={YARD_MIST.center} size={YARD_MIST.size} height={YARD_MIST.height} color={YARD_MIST.color} opacity={YARD_MIST.opacity} speed={2.4} />
      <MeltDecal />
    </group>
  );
}
