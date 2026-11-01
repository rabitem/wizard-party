'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { NEON_LAYOUT, NEON_REALISM } from '@/presentation/config/neon-environment.config';
import { useDisposables } from '../primitives';

const HAZE_SEGMENTS = 48;
const GRADIENT_HEIGHT = 64;

/** Vertical alpha ramp: dense at the street level, clear towards the sky. */
function createHazeTexture(): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture();
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = GRADIENT_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, GRADIENT_HEIGHT);
    // alphaMap reads the green channel, so paint opaque greys (canvas alpha is lost on upload)
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(0.55, '#404040');
    gradient.addColorStop(0.85, '#cccccc');
    gradient.addColorStop(1, '#ffffff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1, GRADIENT_HEIGHT);
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * Depth haze: open cylinders between and behind the skyline rings with a
 * vertical alpha ramp, so distant towers sink into a violet city glow and
 * the setting sun dims towards the horizon. Two static draw calls.
 */
export function SkylineHaze() {
  const assets = useMemo(() => {
    const ramp = createHazeTexture();
    const layers = NEON_REALISM.HAZE.map((layer) => ({
      ...layer,
      geometry: new THREE.CylinderGeometry(layer.radius, layer.radius, layer.height, HAZE_SEGMENTS, 1, true),
      material: new THREE.MeshBasicMaterial({
        color: layer.color,
        alphaMap: ramp,
        transparent: true,
        opacity: layer.opacity,
        depthWrite: false,
        side: THREE.BackSide,
        fog: false,
      }),
    }));
    const disposables: Record<string, { dispose: () => void }> = { ramp };
    layers.forEach((layer, i) => {
      disposables[`geometry${i}`] = layer.geometry;
      disposables[`material${i}`] = layer.material;
    });
    return { layers, disposables };
  }, []);
  useDisposables(assets.disposables);

  return (
    <group>
      {assets.layers.map((layer) => (
        <mesh
          key={layer.radius}
          position={[0, NEON_LAYOUT.GRID_Y + layer.height / 2, 0]}
          geometry={layer.geometry}
          material={layer.material}
        />
      ))}
    </group>
  );
}
