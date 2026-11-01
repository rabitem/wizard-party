'use client';

import type { WoodMaterialProps } from './table-visual-materials';

interface WoodRimBaseProps {
  woodMaterialProps: WoodMaterialProps;
}

/**
 * Main wooden table rim with polished mahogany appearance.
 * Includes the main rim surface and raised wood molding edges.
 */
export function WoodRimBase({ woodMaterialProps }: WoodRimBaseProps) {
  const { moldingColor, apronColor: _apronColor, ...materialProps } = woodMaterialProps;

  return (
    <group>
      {/* Main wooden table rim - polished mahogany */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} castShadow receiveShadow>
        <ringGeometry args={[2.9, 3.35, 64]} />
        <meshPhysicalMaterial {...materialProps} />
      </mesh>

      {/* Raised wood molding - inner edge */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[2.92, 0.025, 16, 64]} />
        <meshPhysicalMaterial
          {...materialProps}
          color={moldingColor}
          roughness={0.35}
        />
      </mesh>

      {/* Raised wood molding - outer edge */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[3.32, 0.025, 16, 64]} />
        <meshPhysicalMaterial
          {...materialProps}
          color={moldingColor}
          roughness={0.35}
        />
      </mesh>
    </group>
  );
}
