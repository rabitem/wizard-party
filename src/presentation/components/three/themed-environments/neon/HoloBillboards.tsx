'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NEON_BILLBOARDS, NEON_COLORS, NEON_LAYOUT, NEON_REALISM } from '@/presentation/config/neon-environment.config';
import { InstancedProp, useDisposables, useFlicker, usePrefersReducedMotion, type FlickerTarget, type PropPlacement } from '../primitives';
import { createBillboardTexture, createScanlineTexture } from './neon-textures';

const HOLO = { OPACITY: 0.85, AMPLITUDE: 0.06, SCANLINE_OPACITY: 0.35, SCANLINE_GAP: 0.02 } as const;
const MAST = { SIZE: 0.35 } as const;
const EMITTER = { HEIGHT: 0.25, DEPTH: 0.6, GAP: 0.3 } as const;

/** A mast from the grid plane up to each billboard plus an emitter bar under it. */
const MASTS: PropPlacement[] = NEON_BILLBOARDS.flatMap((b) => {
  const [x, y, z] = b.position;
  const bottom = y - b.size[1] / 2 - EMITTER.GAP;
  const height = bottom - NEON_LAYOUT.GRID_Y;
  return [
    { position: [x, NEON_LAYOUT.GRID_Y + height / 2, z], scale: [MAST.SIZE, height, MAST.SIZE], rotationY: b.rotationY },
    { position: [x, bottom, z], scale: [b.size[0] * 0.9, EMITTER.HEIGHT, EMITTER.DEPTH], rotationY: b.rotationY },
  ];
});

function additive(map: THREE.Texture, opacity: number, color = '#ffffff'): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map,
    // Slightly above 1 so the hologram blooms like a light source
    color: new THREE.Color(color).multiplyScalar(NEON_REALISM.BLOOM_BOOST.SCREENS),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/**
 * Holographic billboards hovering on masts between the towers: additive
 * canvas-painted ads (no brands) with a shared scrolling scanline overlay and
 * a faint signal flicker. Static with reduced motion.
 */
export function HoloBillboards() {
  const reducedMotion = usePrefersReducedMotion();
  const scanRef = useRef<THREE.Mesh>(null);
  const assets = useMemo(() => {
    const spellMap = createBillboardTexture('spell');
    const cardsMap = createBillboardTexture('cards');
    const scanMap = createScanlineTexture();
    return {
      spellMap,
      cardsMap,
      scanMap,
      spell: additive(spellMap, HOLO.OPACITY),
      cards: additive(cardsMap, HOLO.OPACITY),
      scan: additive(scanMap, HOLO.SCANLINE_OPACITY, NEON_COLORS.cyan),
      box: new THREE.BoxGeometry(1, 1, 1),
      mast: new THREE.MeshStandardMaterial({ color: NEON_COLORS.pole, roughness: 0.5, metalness: 0.6, emissive: NEON_COLORS.violet, emissiveIntensity: 0.15 }),
    };
  }, []);
  useDisposables(assets);

  const flickers = useMemo<FlickerTarget[]>(
    () => [
      { material: assets.spell, base: HOLO.OPACITY, amplitude: HOLO.AMPLITUDE, phase: 0.4, useOpacity: true },
      { material: assets.cards, base: HOLO.OPACITY, amplitude: HOLO.AMPLITUDE, phase: 2.6, useOpacity: true },
    ],
    [assets],
  );
  useFlicker(flickers);

  useFrame((_, delta) => {
    const material = scanRef.current?.material;
    if (reducedMotion || !(material instanceof THREE.MeshBasicMaterial) || !material.map) return;
    // The scanline texture is shared, so scrolling it through one mesh moves every overlay
    const { offset } = material.map;
    offset.y = (offset.y - delta * NEON_LAYOUT.SCANLINE_SPEED + 1) % 1;
  });

  return (
    <group>
      {NEON_BILLBOARDS.map((b, i) => (
        <group key={b.variant} position={b.position} rotation={[0, b.rotationY, 0]}>
          <mesh material={b.variant === 'spell' ? assets.spell : assets.cards}>
            <planeGeometry args={b.size} />
          </mesh>
          <mesh ref={i === 0 ? scanRef : undefined} position={[0, 0, HOLO.SCANLINE_GAP]} material={assets.scan}>
            <planeGeometry args={b.size} />
          </mesh>
        </group>
      ))}
      <InstancedProp geometry={assets.box} material={assets.mast} placements={MASTS} />
    </group>
  );
}
