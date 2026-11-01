'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useThree } from '@react-three/fiber';
import type * as THREE from 'three';
import { buildStaticBatch, disposeStaticBatch } from './static-batch';

interface StaticBatchProps {
  /** Static decor: no animation, no props that change after mount */
  children: ReactNode;
  /** Rebuild the batch when this changes (e.g. a palette the children's colours come from) */
  version?: string | number;
}

/**
 * Renders static children as one merged mesh per material (see buildStaticBatch). The children
 * still mount as usual, so their JSX stays readable and editable; after mount their meshes are
 * hidden and the merged copies, built in the root's space, are drawn instead. Anything that is
 * not batchable keeps rendering by itself, and unmounting restores the children exactly.
 */
export function StaticBatch({ children, version }: StaticBatchProps) {
  const rootRef = useRef<THREE.Group>(null);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const batch = buildStaticBatch(root);
    for (const source of batch.sources) source.visible = false;
    for (const mesh of batch.meshes) {
      root.add(mesh);
      mesh.updateMatrixWorld(true);
    }
    invalidate();
    return () => {
      for (const mesh of batch.meshes) root.remove(mesh);
      for (const source of batch.sources) source.visible = true;
      disposeStaticBatch(batch);
    };
  }, [version, invalidate]);

  return <group ref={rootRef}>{children}</group>;
}
