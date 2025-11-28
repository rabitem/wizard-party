'use client';

import { useState, useEffect, Suspense } from 'react';
import {
  EffectComposer,
  Bloom,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

interface PostProcessingProps {
  enabled?: boolean;
  quality?: 'low' | 'medium' | 'high';
}

function PostProcessingEffects({ quality }: { quality: 'low' | 'medium' | 'high' }) {
  return (
    <EffectComposer multisampling={quality === 'high' ? 8 : quality === 'medium' ? 4 : 0}>
      {/* Bloom for glowing gold elements and highlights */}
      <Bloom
        intensity={0.4}
        luminanceThreshold={0.7}
        luminanceSmoothing={0.9}
        mipmapBlur
        radius={0.6}
      />

      {/* Subtle vignette for cinematic feel */}
      <Vignette
        offset={0.35}
        darkness={0.5}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}

export function PostProcessing({ enabled = true, quality = 'medium' }: PostProcessingProps) {
  const [mounted, setMounted] = useState(false);

  // Only render after component is mounted on client
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(timer);
  }, []);

  if (!enabled || !mounted) return null;

  return (
    <Suspense fallback={null}>
      <PostProcessingEffects quality={quality} />
    </Suspense>
  );
}
