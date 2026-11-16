'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Vec3 } from '@/presentation/config/themed-environment.config';
import { createGlowBillboards } from './glow-sprite-material';

export interface GlowPoint { position: Vec3; scale: number; }
interface GlowSpritesProps { points: readonly GlowPoint[]; material: THREE.SpriteMaterial; }

/** Camera-facing additive halos: one instanced draw, preserving the source's live flicker. */
export function GlowSprites({ points, material: source }: GlowSpritesProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const assets = useMemo(() => {
    return createGlowBillboards(source);
  }, [source]);
  useLayoutEffect(() => {
    const target = mesh.current;
    if (!target) return;
    const pose = new THREE.Object3D();
    points.forEach((point, i) => {
      pose.position.set(...point.position);
      pose.scale.setScalar(point.scale);
      pose.updateMatrix();
      target.setMatrixAt(i, pose.matrix);
    });
    target.instanceMatrix.needsUpdate = true;
    // Billboard corners rotate towards the camera rather than staying in the plane's bounds.
    target.frustumCulled = false;
  }, [points, assets]);
  useEffect(() => () => { assets.geometry.dispose(); assets.material.dispose(); }, [assets]);
  if (!points.length) return null;
  return <instancedMesh ref={mesh} args={[assets.geometry, assets.material, points.length]} onBeforeRender={assets.sync} />;
}
