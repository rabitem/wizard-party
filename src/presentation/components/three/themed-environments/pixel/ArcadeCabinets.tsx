'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  PIXEL_BACK_ROW_COUNT,
  PIXEL_CABINET as CAB,
  PIXEL_CABINETS,
  PIXEL_COLORS,
  PIXEL_LIGHTS,
  PIXEL_REALISM,
  PIXEL_SCREENS,
} from '@/presentation/config/pixel-environment.config';
import {
  addSurfaceDetail,
  GlowSprites,
  InstancedProp,
  MatrixInstances,
  createGlowMaterial,
  useDisposables,
  useFlicker,
  usePrefersReducedMotion,
  type GlowPoint,
  type PropPlacement,
} from '../primitives';
import {
  CABINET_MARQUEE_OFFSET,
  CABINET_SCREEN_OFFSET,
  buildCabinetDetails,
  createCabinetBodyGeometry,
  createCabinetTrimGeometry,
  screenGlowPosition,
} from './cabinet-geometry';
import { CabinetReflections } from './CabinetReflections';
import { createCrtScreenMaterial } from './crt-screen-material';
import { createScreenAtlas, createScreenGeometry } from './pixel-screens';
import { createMarqueeTexture } from './pixel-textures';

const BODY_PLACEMENTS: PropPlacement[] = PIXEL_CABINETS.map(({ position, rotationY, color }) => ({ position, rotationY, color }));
const PLAIN_PLACEMENTS: PropPlacement[] = PIXEL_CABINETS.map(({ position, rotationY }) => ({ position, rotationY }));
const SCREEN_GROUPS = Array.from({ length: PIXEL_SCREENS.VARIANTS }, (_, variant) => ({
  id: `screen-${variant}`,
  variant,
  placements: PIXEL_CABINETS.filter((c) => c.variant === variant).map(({ position, rotationY }): PropPlacement => ({ position, rotationY })),
}));
const DETAILS = buildCabinetDetails(PIXEL_CABINETS);
const SCREEN_GLOWS: GlowPoint[] = PIXEL_CABINETS.slice(0, PIXEL_BACK_ROW_COUNT).map((cabinet) => ({
  position: screenGlowPosition(cabinet, 0.6),
  scale: 2.3,
}));
/** Frame shown to reduced-motion users (a busy moment of every mini game) */
const STILL_TICK = 37;
const GLOW_OPACITY = 0.32;

/**
 * Rows of arcade cabinets: tinted bodies, dark trim, glowing marquees and
 * animated pixel screens (one shared atlas repainted at PIXEL_SCREENS.FPS)
 * rendered as blooming CRTs with scanlines, plus their reflections on the
 * glossy floor. About a dozen draw calls for every cabinet in the hall.
 */
export function ArcadeCabinets() {
  const reducedMotion = usePrefersReducedMotion();
  const atlas = useMemo(() => createScreenAtlas(), []);
  const assets = useMemo(
    () => ({
      body: createCabinetBodyGeometry(),
      trim: createCabinetTrimGeometry(),
      marquee: new THREE.PlaneGeometry(...CAB.MARQUEE_SIZE),
      detail: new THREE.BoxGeometry(1, 1, 1),
      marqueeTexture: createMarqueeTexture(),
      atlasTexture: atlas.texture,
      reflectionTexture: atlas.reflection,
      // Painted wood cabinets: fine grain and roughness variation instead of flat plastic
      bodyMaterial: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.45, metalness: 0.05 }), {
        scale: 3,
        normalStrength: 0.15,
      }),
      trimMaterial: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: PIXEL_COLORS.cabinetTrim, roughness: 0.6, metalness: 0.2 }), {
        scale: 4,
        normalStrength: 0.2,
      }),
      detailMaterial: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
      glow: createGlowMaterial(PIXEL_COLORS.screenGlow, GLOW_OPACITY),
    }),
    [atlas],
  );
  const crt = useMemo(() => createCrtScreenMaterial(atlas.texture), [atlas]);
  const materials = useMemo(() => {
    const marquee = new THREE.MeshBasicMaterial({ map: assets.marqueeTexture, toneMapped: false });
    marquee.color.setScalar(PIXEL_REALISM.SCREEN.MARQUEE_BRIGHTNESS);
    return { screen: crt.material, marquee };
  }, [crt, assets.marqueeTexture]);
  const screenGeometries = useMemo(() => SCREEN_GROUPS.map(({ variant }) => createScreenGeometry(variant, ...CAB.SCREEN_SIZE)), []);
  const screenGeometryRecord = useMemo(() => Object.fromEntries(screenGeometries.map((g, i) => [`screen${i}`, g])), [screenGeometries]);
  useDisposables(assets);
  useDisposables(materials);
  useDisposables(screenGeometryRecord);

  const lastTick = useRef(-1);
  useFrame(({ clock }) => {
    if (!reducedMotion) crt.setTime(clock.getElapsedTime());
    const tick = reducedMotion ? STILL_TICK : Math.floor(clock.getElapsedTime() * PIXEL_SCREENS.FPS);
    if (tick === lastTick.current) return;
    lastTick.current = tick;
    atlas.paint(tick);
  });

  const flickerTargets = useMemo(
    () => [{ material: assets.glow, base: GLOW_OPACITY, amplitude: PIXEL_LIGHTS.pulseAmplitude, useOpacity: true }],
    [assets.glow],
  );
  useFlicker(flickerTargets);

  return (
    <group>
      <InstancedProp geometry={assets.body} material={assets.bodyMaterial} placements={BODY_PLACEMENTS} />
      <InstancedProp geometry={assets.trim} material={assets.trimMaterial} placements={PLAIN_PLACEMENTS} />
      <InstancedProp geometry={assets.marquee} material={materials.marquee} placements={BODY_PLACEMENTS} offset={CABINET_MARQUEE_OFFSET} />
      {SCREEN_GROUPS.map(({ id, variant, placements }) => (
        <InstancedProp
          key={id}
          geometry={screenGeometries[variant]}
          material={materials.screen}
          placements={placements}
          offset={CABINET_SCREEN_OFFSET}
        />
      ))}
      <MatrixInstances geometry={assets.detail} material={assets.detailMaterial} matrices={DETAILS.matrices} colors={DETAILS.colors} />
      <GlowSprites points={SCREEN_GLOWS} material={assets.glow} />
      <CabinetReflections texture={atlas.reflection} />
    </group>
  );
}
