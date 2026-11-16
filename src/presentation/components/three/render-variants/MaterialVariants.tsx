'use client';

import { useLayoutEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { bindSceneMaterials, MaterialVariantCache } from './material-variants';

/** Prepare immediately before rendering, after every useFrame subscriber has mounted effects. */
export function MaterialVariants() {
  const scene = useThree(state => state.scene);
  const [cache] = useState(() => new MaterialVariantCache());
  useLayoutEffect(() => {
    const unbind = bindSceneMaterials(scene, cache);
    return () => {
      unbind();
      cache.dispose();
    };
  }, [scene, cache]);
  return null;
}
