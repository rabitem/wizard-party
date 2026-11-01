'use client';

import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { CharacterAppearance } from '@shared/domain/character';

import { CharacterFigure } from '@/presentation/components/character';
import { CHARACTER_CLIPS, CHARACTER_EDITOR } from '@/presentation/config/character.config';

interface CharacterPreviewProps {
  appearance: CharacterAppearance;
  /** Increments on every save; the character cheers once. */
  celebration: number;
}

/** The editor's live 3D view: idle, turnable, cheering after a save. Loaded only on the Character tab. */
export default function CharacterPreview({ appearance, celebration }: CharacterPreviewProps) {
  // The last celebration that finished; a newer one cheers until its timer catches up.
  const [settled, setSettled] = useState(celebration);
  const cheering = celebration !== settled;

  useEffect(() => {
    if (!cheering) return;
    const timer = window.setTimeout(() => setSettled(celebration), CHARACTER_EDITOR.CHEER_MS);
    return () => window.clearTimeout(timer);
  }, [cheering, celebration]);

  return (
    <Canvas camera={{ position: [...CHARACTER_EDITOR.CAMERA_POSITION], fov: CHARACTER_EDITOR.FOV_DEGREES }} dpr={[1, 2]}>
      <ambientLight intensity={0.85} />
      <directionalLight position={[2, 4, 3]} intensity={1.6} />
      <Suspense fallback={null}>
        <CharacterFigure appearance={appearance} clip={cheering ? CHARACTER_CLIPS.CHEER : CHARACTER_CLIPS.IDLE} />
      </Suspense>
      <OrbitControls target={[...CHARACTER_EDITOR.CAMERA_TARGET]} enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI / 2} />
    </Canvas>
  );
}
