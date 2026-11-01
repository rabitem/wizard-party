'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PIXEL_REALISM } from '@/presentation/config/pixel-environment.config';
import { addSurfaceDetail, InstancedProp, useDisposables, usePrefersReducedMotion, type PropPlacement } from '../primitives';
import { shaderUniforms, useDeviceTier } from '../primitives/realism';
import { STARFIELD_FRAGMENT_SHADER, STARFIELD_VERTEX_SHADER } from './starfield-shader';

const { STAR_WINDOWS, STARFIELD: SF } = PIXEL_REALISM;
const FROZEN_TIME = 4;

type StarWindow = (typeof STAR_WINDOWS)[number];

/** Four frame bars around each window, in world space. */
function buildFrames(): PropPlacement[] {
  const t = SF.FRAME_THICKNESS;
  return STAR_WINDOWS.flatMap((w: StarWindow) => {
    const [x, y, z] = w.position;
    const [width, height] = w.size;
    const cos = Math.cos(w.rotationY);
    const sin = Math.sin(w.rotationY);
    const at = (lx: number, ly: number): PropPlacement['position'] => [x + lx * cos + (SF.FRAME_DEPTH / 2) * sin, y + ly, z - lx * sin + (SF.FRAME_DEPTH / 2) * cos];
    return [
      { position: at(0, height / 2 + t / 2), scale: [width + t * 2, t, SF.FRAME_DEPTH], rotationY: w.rotationY },
      { position: at(0, -height / 2 - t / 2), scale: [width + t * 2, t, SF.FRAME_DEPTH], rotationY: w.rotationY },
      { position: at(-width / 2 - t / 2, 0), scale: [t, height, SF.FRAME_DEPTH], rotationY: w.rotationY },
      { position: at(width / 2 + t / 2, 0), scale: [t, height, SF.FRAME_DEPTH], rotationY: w.rotationY },
    ] satisfies PropPlacement[];
  });
}

const FRAMES = buildFrames();

function createStarfieldMaterial(pane: StarWindow, layers: number): THREE.ShaderMaterial {
  const [moonX, moonY, moonRadius] = SF.MOON;
  return new THREE.ShaderMaterial({
    vertexShader: STARFIELD_VERTEX_SHADER,
    fragmentShader: STARFIELD_FRAGMENT_SHADER,
    uniforms: {
      uTime: { value: FROZEN_TIME },
      uSize: { value: new THREE.Vector2(...pane.size) },
      uPixels: { value: SF.PIXELS_PER_UNIT },
      uDepths: { value: new THREE.Vector3(...SF.DEPTHS) },
      uDensities: { value: new THREE.Vector3(...SF.DENSITIES) },
      uLayers: { value: layers },
      uSteps: { value: SF.TWINKLE_STEPS },
      uSkyTop: { value: new THREE.Color(SF.SKY_TOP) },
      uSkyBottom: { value: new THREE.Color(SF.SKY_BOTTOM) },
      uNebula: { value: new THREE.Color(SF.NEBULA) },
      uStarWarm: { value: new THREE.Color(SF.STAR_WARM) },
      uStarCool: { value: new THREE.Color(SF.STAR_COOL) },
      uMoon: { value: new THREE.Vector4(moonX, moonY, pane.moon ? moonRadius : 0, 0) },
      uMoonColor: { value: new THREE.Color(SF.MOON_COLOR) },
    },
    toneMapped: false,
  });
}

function StarfieldPane({ pane, material }: { pane: StarWindow; material: THREE.ShaderMaterial }) {
  const reducedMotion = usePrefersReducedMotion();
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const u = shaderUniforms(ref.current);
    if (u && !reducedMotion) u.uTime.value = clock.getElapsedTime();
  });
  return (
    <mesh ref={ref} position={pane.position} rotation={[0, pane.rotationY, 0]} material={material}>
      <planeGeometry args={pane.size} />
    </mesh>
  );
}

/**
 * Space windows high on the arcade walls: a parallax pixel starfield with
 * stepped 8-bit twinkle, a banded sky, nebula and pixel moon, all in one
 * fragment shader per window, framed by dark trim. Fewer star layers on
 * low-end devices; the twinkle freezes for reduced motion.
 */
export function StarfieldWindows() {
  const tier = useDeviceTier();
  const assets = useMemo(() => {
    const record: Record<string, { dispose: () => void }> = {
      box: new THREE.BoxGeometry(1, 1, 1),
      frame: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: SF.FRAME_COLOR, roughness: 0.5, metalness: 0.4 }), { scale: 2 }),
    };
    STAR_WINDOWS.forEach((w) => {
      record[w.id] = createStarfieldMaterial(w, SF.LAYERS[tier]);
    });
    return record;
  }, [tier]);
  useDisposables(assets);

  return (
    <group>
      {STAR_WINDOWS.map((w) => (
        <StarfieldPane key={w.id} pane={w} material={assets[w.id] as THREE.ShaderMaterial} />
      ))}
      <InstancedProp geometry={assets.box as THREE.BufferGeometry} material={assets.frame as THREE.Material} placements={FRAMES} />
    </group>
  );
}
