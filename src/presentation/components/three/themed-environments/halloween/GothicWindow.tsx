'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { HALLOWEEN_COLORS, HALLOWEEN_LAYOUT, HALLOWEEN_REALISM } from '@/presentation/config/halloween-environment.config';
import type { Vec3 } from '@/presentation/config/themed-environment.config';
import { createPbrMaterial, useDisposables } from '../primitives';

const FRAME = 0.18;
const MULLION = 0.07;
const DEPTH = 0.12;

/** Pointed gothic arch outline, base centred at (0, 0). */
function archShape(width: number, height: number): THREE.Shape {
  const half = width / 2;
  const shoulder = height - width * 0.85;
  const shape = new THREE.Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(half, 0);
  shape.lineTo(half, shoulder);
  shape.quadraticCurveTo(half, height - width * 0.25, 0, height);
  shape.quadraticCurveTo(-half, height - width * 0.25, -half, shoulder);
  shape.closePath();
  return shape;
}

function useWindowAssets(width: number, height: number) {
  return useMemo(() => {
    const outer = archShape(width + FRAME * 2, height + FRAME);
    const inner = archShape(width, height);
    const framePath = archShape(width + FRAME * 2, height + FRAME);
    framePath.holes.push(new THREE.Path(inner.getPoints(24)));
    const frame = new THREE.ExtrudeGeometry(framePath, { depth: DEPTH, bevelEnabled: false, curveSegments: 16 });
    const glass = new THREE.ShapeGeometry(inner, 16);
    const halo = new THREE.ShapeGeometry(outer, 16);
    return { frame, glass, halo };
  }, [width, height]);
}

/** Stone frame / sill (procedural PBR) and dark leaded mullions, shared within one window. */
function useWindowMaterials() {
  return useMemo(
    () => ({
      stone: createPbrMaterial('stone', { color: HALLOWEEN_COLORS.stone, accent: HALLOWEEN_COLORS.mortar, seed: 3, repeat: [0.4, 0.4] }),
      lead: new THREE.MeshStandardMaterial({ color: HALLOWEEN_COLORS.woodDark, roughness: 0.55, metalness: 0.35 }),
      moon: new THREE.MeshBasicMaterial({
        color: new THREE.Color(HALLOWEEN_COLORS.moon).multiplyScalar(HALLOWEEN_REALISM.MOON_BRIGHTNESS),
        toneMapped: false,
      }),
    }),
    [],
  );
}

interface GothicWindowProps {
  position: Vec3;
  rotationY?: number;
  /** Show the full moon behind this pane */
  withMoon?: boolean;
}

/**
 * Moonlit gothic window: extruded stone frame, glowing glass, lead mullions
 * and a sill. The volumetric moon shafts are drawn once for all windows by
 * <HalloweenAtmosphere />.
 */
export function GothicWindow({ position, rotationY = 0, withMoon = false }: GothicWindowProps) {
  const width = HALLOWEEN_LAYOUT.WINDOW_WIDTH;
  const height = HALLOWEEN_LAYOUT.WINDOW_HEIGHT;
  const geometries = useWindowAssets(width, height);
  const materials = useWindowMaterials();
  useDisposables(geometries);
  useDisposables(materials);
  const mullionHeight = height - width * 0.3;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={geometries.halo} position={[0, -FRAME / 2, -0.02]}>
        <meshBasicMaterial color={HALLOWEEN_COLORS.moonGlow} transparent opacity={0.12} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh geometry={geometries.glass} position={[0, 0, 0.01]}>
        <meshBasicMaterial color={HALLOWEEN_COLORS.moonGlass} transparent opacity={0.55} toneMapped={false} />
      </mesh>
      {withMoon ? (
        <mesh position={[width * 0.12, height * 0.68, 0.02]} material={materials.moon}>
          <circleGeometry args={[width * 0.22, 24]} />
        </mesh>
      ) : null}
      <mesh geometry={geometries.frame} position={[0, -FRAME / 2, 0]} material={materials.stone} />
      <mesh position={[0, mullionHeight / 2, 0.05]} material={materials.lead}>
        <boxGeometry args={[MULLION, mullionHeight, MULLION]} />
      </mesh>
      {[0.3, 0.6].map((t) => (
        <mesh key={t} position={[0, height * t, 0.05]} material={materials.lead}>
          <boxGeometry args={[width, MULLION, MULLION]} />
        </mesh>
      ))}
      <mesh position={[0, -FRAME, 0.22]} material={materials.stone}>
        <boxGeometry args={[width + FRAME * 3, 0.14, 0.45]} />
      </mesh>
    </group>
  );
}
