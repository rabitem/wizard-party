'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { RenderQualityProfile, RenderQualityTier } from '@/presentation/config/render-quality.config';
import { readRenderDeviceSignals } from './graphics-probe';
import { resolveRenderProfile } from './quality-profile';
import { readLearnedTier, readTierOverride, writeLearnedTier } from './quality-tier-storage';
import { selectInitialTier } from './select-initial-tier';

export interface RenderQualityContextValue {
  /** Current tier (runtime settings follow it) */
  tier: RenderQualityTier;
  /** Tier the WebGL context was created for (structural settings follow it) */
  structuralTier: RenderQualityTier;
  profile: RenderQualityProfile;
  /** Whether the frame-time governor may change the tier */
  adaptive: boolean;
  setTier: (tier: RenderQualityTier) => void;
}

const DEFAULT_TIER: RenderQualityTier = 'high';

const FALLBACK: RenderQualityContextValue = {
  tier: DEFAULT_TIER,
  structuralTier: DEFAULT_TIER,
  profile: resolveRenderProfile(DEFAULT_TIER, DEFAULT_TIER),
  adaptive: false,
  setTier: () => undefined,
};

const RenderQualityContext = createContext<RenderQualityContextValue>(FALLBACK);

interface StartingTier {
  tier: RenderQualityTier;
  forced: boolean;
}

/** A forced tier wins; otherwise the tier this device settled on last time, else detection. */
function resolveStartingTier(): StartingTier {
  const override = readTierOverride();
  if (override) return { tier: override, forced: true };
  return { tier: readLearnedTier() ?? selectInitialTier(readRenderDeviceSignals()), forced: false };
}

interface RenderQualityProviderProps {
  /** Allow the frame-time governor (off in the sandbox, whose virtual clock has fixed frame times) */
  adaptive: boolean;
  children: ReactNode;
}

/**
 * Render quality of the game table. Lives outside the Canvas (the canvas's pixel ratio, MSAA and
 * shadow type depend on it); R3F bridges the context into the scene.
 */
export function RenderQualityProvider({ adaptive: allowAdaptive, children }: RenderQualityProviderProps) {
  const [start] = useState(resolveStartingTier);
  const [tier, setTierState] = useState(start.tier);
  const adaptive = allowAdaptive && !start.forced;

  const setTier = useCallback((next: RenderQualityTier) => {
    setTierState(next);
    if (adaptive) writeLearnedTier(next);
  }, [adaptive]);

  const value = useMemo<RenderQualityContextValue>(() => ({
    tier,
    structuralTier: start.tier,
    profile: resolveRenderProfile(start.tier, tier),
    adaptive,
    setTier,
  }), [tier, start.tier, adaptive, setTier]);

  return <RenderQualityContext.Provider value={value}>{children}</RenderQualityContext.Provider>;
}

export function useRenderQuality(): RenderQualityContextValue {
  return useContext(RenderQualityContext);
}
