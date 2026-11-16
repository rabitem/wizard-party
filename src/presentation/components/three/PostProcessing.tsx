'use client';

import { Suspense } from 'react';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useSelectedTableTheme } from '@/presentation/components/table/table-theme';
import { BLOOM_DEFAULTS, type AtmosphereBloom } from '@/presentation/config/realism-atmosphere.config';
import { COLOR_PIPELINE } from '@/presentation/config/render-quality.config';
import { getEnvironmentAtmosphere } from './themed-environments/environment-registry';
import { useRenderQuality } from './render-quality';
import { ShaderWarmup } from './shader-warmup';

interface BloomComposerProps {
  bloom: AtmosphereBloom;
  multisampling: number;
  levels: number;
  warmupKey: string;
}

/**
 * Bloom for rooms that ask for it. The composer renders the scene into an HDR target and forces
 * NoToneMapping on the renderer while mounted, so the same tone-mapping operator runs here as
 * the last effect (with renderer.toneMappingExposure, which the room's atmosphere sets). Without
 * bloom nothing is mounted and the renderer tone-maps directly: no extra target, resolve or
 * full-screen pass. The screen vignette is a CSS layer over the canvas (Game3DCanvas).
 */
function BloomComposer({ bloom, multisampling, levels, warmupKey }: BloomComposerProps) {
  return (
    <EffectComposer multisampling={multisampling}>
      <ShaderWarmup warmupKey={warmupKey} />
      <Bloom
        mipmapBlur
        levels={levels}
        intensity={bloom.intensity}
        luminanceThreshold={bloom.threshold}
        luminanceSmoothing={bloom.smoothing ?? BLOOM_DEFAULTS.SMOOTHING}
        radius={bloom.radius ?? BLOOM_DEFAULTS.RADIUS}
      />
      <ToneMapping mode={ToneMappingMode[COLOR_PIPELINE.COMPOSER_TONE_MAPPING_MODE]} />
    </EffectComposer>
  );
}

/**
 * Post-processing of the table: only the themed rooms' bloom, when the session's structural tier
 * allows it (mounting the composer recompiles every lit program, so it never toggles mid-game).
 */
export function PostProcessing() {
  const tableTheme = useSelectedTableTheme();
  const { profile, tier, structuralTier } = useRenderQuality();
  const bloom = getEnvironmentAtmosphere(tableTheme.id)?.bloom;
  const warmupKey = `${tableTheme.id}:${structuralTier}`;
  if (!bloom || !profile.bloom) return <ShaderWarmup warmupKey={warmupKey} />;

  // The rooms' bloom was tuned at the medium level count; only the top tier widens the glow
  const levels = tier === 'ultra' ? BLOOM_DEFAULTS.LEVELS.high : BLOOM_DEFAULTS.LEVELS.medium;
  return (
    <Suspense fallback={null}>
      <BloomComposer bloom={bloom} multisampling={profile.composerMultisampling} levels={levels} warmupKey={warmupKey} />
    </Suspense>
  );
}
