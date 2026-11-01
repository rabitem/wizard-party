'use client';

import * as THREE from 'three';
import { CarvedApronDetail } from './CarvedApronDetail';
import type { WoodMaterialProps } from './table-visual-materials';

interface WoodApronProps {
  woodMaterialProps: WoodMaterialProps;
}

/**
 * Wood body/apron - vertical support section with carved detail.
 * The decorative skirt that hangs below the main table surface.
 */
export function WoodApron({ woodMaterialProps }: WoodApronProps) {
  const { apronColor, moldingColor: _moldingColor, ...materialProps } = woodMaterialProps;

  return (
    <group>
      {/* Wood body/apron - vertical support with carved detail */}
      <mesh position={[0, -0.06, 0]} castShadow>
        <cylinderGeometry args={[3.7, 3.75, 0.12, 64, 1, true]} />
        <meshPhysicalMaterial
          {...materialProps}
          color={apronColor}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Carved inlay detail on apron */}
      <CarvedApronDetail />
    </group>
  );
}
