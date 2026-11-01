'use client';

import { Component, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';

import type { PodiumStand } from '@/presentation/types/podium.types';

// By path, not the render-quality barrel: the barrel also exports the canvas's governor, which
// would bring react-three-fiber into the portrait-only podium.
import { probeGraphics } from '../three/render-quality/graphics-probe';
import { RenderQualityProvider, useRenderQuality } from '../three/render-quality/RenderQualityProvider';
import { podiumRenderMode } from './podium-layout';
import { PodiumPortraits } from './PodiumPortraits';

// react-three-fiber, drei and the character model load only where the figures are shown.
const PodiumScene = dynamic(() => import('./PodiumScene'), { ssr: false });

interface PodiumStageProps {
  stands: readonly PodiumStand[];
  reduceMotion: boolean;
}

/** If the figures fail (assets, WebGL), the podium shows the portraits instead. */
class FiguresBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function StageForDevice({ stands, reduceMotion }: PodiumStageProps) {
  // The tier the game table would start with on this device (forced, learned, else detected).
  const { structuralTier } = useRenderQuality();
  const [webgl] = useState(() => probeGraphics().webgl2);
  const portraits = <PodiumPortraits stands={stands} />;
  if (podiumRenderMode(webgl, structuralTier) === 'portraits') return portraits;
  return (
    <FiguresBoundary fallback={portraits}>
      <PodiumScene stands={stands} reduceMotion={reduceMotion} />
    </FiguresBoundary>
  );
}

/**
 * The podium's picture: 3D figures on capable devices, portraits on the low render tier or
 * without WebGL. Loaded with next/dynamic (ssr: false) by CharacterPodium.
 */
export default function PodiumStage(props: PodiumStageProps) {
  return (
    <RenderQualityProvider adaptive={false}>
      <StageForDevice {...props} />
    </RenderQualityProvider>
  );
}
