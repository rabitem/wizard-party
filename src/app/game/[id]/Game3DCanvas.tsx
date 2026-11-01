'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import type * as THREE from 'three';
import { IGameState, ICard, CardPhysicsState } from '@shared/domain';
import { Game3DScene } from '@/presentation/components/three';
import { configureTextRendering } from '@/presentation/components/three/configure-text-rendering';
import { FrameScheduler } from '@/presentation/components/three/frame-scheduling';
import { getGameCanvasGlOptions } from '@/presentation/components/three/game-canvas-gl';
import { AdaptiveQuality, RenderQualityProvider, resolveAntialias, useRenderQuality } from '@/presentation/components/three/render-quality';
import { SceneTextFontWarmup } from '@/presentation/components/three/SceneText';
import { TableReadySignal } from '@/presentation/components/three/TableReadySignal';
import { WebGLContextHandler, WebGLErrorBoundary, useGraphicsLifecycle } from '@/presentation/components/WebGLContextHandler';
import { WebGLRecoveryOverlay, WebGLUnavailableOverlay } from '@/presentation/components/overlays';
import { SHADOW_CONFIG, VIGNETTE_OVERLAY } from '@/presentation/config/render-quality.config';
import { useClientTelemetryScope } from '@/presentation/hooks/useClientTelemetryScope';
import { isSandboxRoute } from '@/presentation/utils/sandbox-route';
import type { DropInfo } from '@/presentation/hooks/useDragToPlay';
import type { CollectionAnimationMode } from '@/presentation/components/settings';
import type { TrickResult } from '@/presentation/types';

// Before any 3D text renders: fallback fonts come through our proxy, not a third-party CDN.
configureTextRendering();

interface Game3DCanvasProps {
  gameState: IGameState;
  playerId: string;
  selectedCardId: string | null;
  playableCardIds: string[];
  onCardSelect: (cardId: string) => void;
  onCardPlay: (cardId: string, dropInfo?: DropInfo) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDraggingCard: boolean;
  isMobile: boolean;
  orderedCards: ICard[];
  handAnimation: 'none' | 'shuffle' | 'sort';
  trickResult: TrickResult | null;
  onCardLand: (card: ICard) => void;
  onTrickCollectComplete: () => void;
  onAllCardsLanded: () => void;
  onHandAnimationProgress: (progress: number) => void;
  isWaitingForCardsToLand: boolean;
  getCardPhysicsState: (cardId: string) => CardPhysicsState | null;
  shouldShowPlayedCard: (cardId: string) => boolean;
  shouldAnimatePlayedCard: (cardId: string) => boolean;
  onPlayedCardAnimationComplete: (cardId: string) => void;
  collectionAnimationMode: CollectionAnimationMode;
  disableInteractions?: boolean;
  /** Called once the table is drawn on screen, or right away when it cannot draw at all */
  onTableReady?: () => void;
}

type SceneProps = Omit<Game3DCanvasProps, 'disableInteractions' | 'onTableReady'>;

/** Screen vignette as a static CSS layer (no full-screen post-processing pass). */
function VignetteOverlay() {
  return <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: VIGNETTE_OVERLAY.BACKGROUND }} />;
}

/** Shadow map setup: one PCF caster, re-rendered only when the frame scheduler asks for it. */
function useShadowOptions(enabled: boolean): Partial<THREE.WebGLShadowMap> | false {
  return useMemo(() => (enabled ? { enabled: true, type: SHADOW_CONFIG.TYPE, autoUpdate: false } : false), [enabled]);
}

interface GameCanvasHostProps {
  disableInteractions: boolean;
  onTableReady?: () => void;
  sceneProps: SceneProps;
}

function GameCanvasHost({ disableInteractions, onTableReady, sceneProps }: GameCanvasHostProps) {
  const lifecycle = useGraphicsLifecycle();
  const { profile } = useRenderQuality();
  const { status, canvasKey } = lifecycle.state;
  // An unavailable, lost or rebuilding canvas shows its own overlay; never cover it with the loader.
  useEffect(() => {
    if (status !== 'ready') onTableReady?.();
  }, [status, onTableReady]);
  // Context attributes are fixed per canvas and the structural profile never changes at runtime.
  // Depend on the flag only: a new options object would re-apply the renderer's tone mapping
  // under a mounted bloom composer, which owns it while mounted.
  const [antialias] = useState(() => resolveAntialias(profile, window.devicePixelRatio));
  const glOptions = useMemo(() => getGameCanvasGlOptions({ antialias }), [antialias]);
  const shadows = useShadowOptions(profile.shadows);
  const dpr = useMemo<[number, number]>(() => [1, profile.dprMax], [profile.dprMax]);

  if (status === 'unavailable') return <WebGLUnavailableOverlay />;
  if (status === 'rebuilding' || status === 'failed') return <WebGLRecoveryOverlay onForceRecover={lifecycle.retry} />;

  return (
    <WebGLErrorBoundary key={`webgl-boundary-${canvasKey}`} onError={lifecycle.handleRenderError}>
      <div className={`absolute inset-0 z-10 ${disableInteractions ? 'pointer-events-none' : ''}`}>
        <Canvas
          key={`game-canvas-${canvasKey}`}
          frameloop="demand"
          shadows={shadows}
          className="touch-none game-canvas"
          dpr={dpr}
          gl={glOptions}
        >
          <WebGLContextHandler
            onContextLost={lifecycle.handleContextLost}
            onContextRestored={lifecycle.handleContextRestored}
            onFrameRendered={lifecycle.handleFrameRendered}
          />
          {onTableReady ? <TableReadySignal onReady={onTableReady} /> : null}
          <FrameScheduler ambientFps={profile.ambientFps}>
            <AdaptiveQuality />
            <SceneTextFontWarmup />
            <Game3DScene {...sceneProps} />
          </FrameScheduler>
        </Canvas>
        <VignetteOverlay />
        {status === 'lost' ? <WebGLRecoveryOverlay onForceRecover={lifecycle.retry} /> : null}
      </div>
    </WebGLErrorBoundary>
  );
}

/**
 * Memoized: the page re-renders on every HUD change (timers, chat, connection status); the canvas
 * only when a prop of the table changes. Callbacks passed in must be stable.
 */
function Game3DCanvasView({ disableInteractions = false, onTableReady, ...sceneProps }: Game3DCanvasProps) {
  useClientTelemetryScope('game');
  const [isSandbox] = useState(isSandboxRoute);

  return (
    <RenderQualityProvider adaptive={!isSandbox}>
      <GameCanvasHost disableInteractions={disableInteractions} onTableReady={onTableReady} sceneProps={sceneProps} />
    </RenderQualityProvider>
  );
}

export const Game3DCanvas = memo(Game3DCanvasView);
