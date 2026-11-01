import {
  MSAA_MAX_DPR,
  RENDER_QUALITY_TIERS,
  RUNTIME_QUALITY,
  STRUCTURAL_QUALITY,
  type RenderQualityProfile,
  type RenderQualityTier,
} from '@/presentation/config/render-quality.config';

export function isRenderQualityTier(value: unknown): value is RenderQualityTier {
  return typeof value === 'string' && (RENDER_QUALITY_TIERS as readonly string[]).includes(value);
}

export function tierIndex(tier: RenderQualityTier): number {
  return RENDER_QUALITY_TIERS.indexOf(tier);
}

/** The neighbouring tier in `direction`, or null at either end. */
export function stepTier(tier: RenderQualityTier, direction: -1 | 1): RenderQualityTier | null {
  return RENDER_QUALITY_TIERS[tierIndex(tier) + direction] ?? null;
}

/**
 * Effective settings: runtime knobs follow the current tier, structural ones stay with the tier
 * the WebGL context was created for (see render-quality.config.ts).
 */
export function resolveRenderProfile(structuralTier: RenderQualityTier, runtimeTier: RenderQualityTier): RenderQualityProfile {
  return { ...RUNTIME_QUALITY[runtimeTier], ...STRUCTURAL_QUALITY[structuralTier] };
}

/** Native MSAA only where the tier wants it and the screen is not already dense enough. */
export function resolveAntialias(profile: Pick<RenderQualityProfile, 'antialias'>, devicePixelRatio: number): boolean {
  return profile.antialias && devicePixelRatio < MSAA_MAX_DPR;
}
