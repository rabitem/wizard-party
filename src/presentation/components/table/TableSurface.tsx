'use client';

import { Suspense } from 'react';
import { useTexture } from '@react-three/drei';
import { IPlayer } from '@shared/domain';
import { TABLE_TEXTURE_URLS } from '@/presentation/config/assets.config';
import { FeltSurface } from './FeltSurface';
import { WoodTableRim } from './WoodTableRim';

// Start the table texture fetches when this chunk loads, in parallel with rapier's
// initialisation, instead of when the rim and felt first render inside <Physics>.
if (typeof window !== 'undefined') {
  useTexture.preload(TABLE_TEXTURE_URLS.FELT);
}

interface TableSurfaceProps {
  players: IPlayer[];
  localPlayerId: string;
  currentPlayerIndex: number;
}

/** Flat stand-ins for the rim and felt while their textures load */
function TableSurfaceFallback() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <ringGeometry args={[2.9, 3.3, 32]} />
        <meshStandardMaterial color="#5c3a21" roughness={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[2.88, 32]} />
        <meshStandardMaterial color="#1a5c3a" roughness={0.95} />
      </mesh>
    </>
  );
}

/**
 * Wood rim and felt behind one Suspense boundary, so they replace the fallback in the same
 * frame. The rim's ground shadow is baked once on that frame and must see the felt too; with
 * separate boundaries a late felt would be missing from the shadow for the whole game.
 */
export function TableSurface({ players, localPlayerId, currentPlayerIndex }: TableSurfaceProps) {
  return (
    <Suspense fallback={<TableSurfaceFallback />}>
      <WoodTableRim players={players} localPlayerId={localPlayerId} currentPlayerIndex={currentPlayerIndex} />
      <FeltSurface />
    </Suspense>
  );
}
