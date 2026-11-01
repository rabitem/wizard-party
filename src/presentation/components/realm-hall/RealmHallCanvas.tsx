'use client';

import { Component, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { useReducedMotion } from 'motion/react';
import { REALM_HALL } from '@/presentation/config/realm-hall.config';
import { SHADOW_CONFIG, VIGNETTE_OVERLAY } from '@/presentation/config/render-quality.config';
import { configureTextRendering } from '../three/configure-text-rendering';
import { FrameScheduler } from '../three/frame-scheduling';
import { getGameCanvasGlOptions } from '../three/game-canvas-gl';
import { RenderQualityProvider, resolveAntialias, useRenderQuality } from '../three/render-quality';
import { RealmHallScene } from './RealmHallScene';

// The rooms carry 3D text (banners, signs): fallback fonts come through our proxy, as in the game.
configureTextRendering();

let webglSupport: boolean | undefined;

/**
 * Probed once per page: every probe creates a WebGL context, and browsers drop the oldest context
 * past their limit, which could be the room's own.
 */
function hasWebGL(): boolean {
  if (webglSupport === undefined) {
    try {
      const probe = document.createElement('canvas').getContext('webgl2');
      webglSupport = !!probe;
      probe?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}

const noSubscribe = () => () => {};

/** One object for the Canvas's lifetime: a new one on each render would make R3F reconfigure its root. */
const CAMERA = { fov: REALM_HALL.CAMERA_FOV, position: [...REALM_HALL.STOPS[0].position] as [number, number, number], near: 0.1, far: 120 };

/** If the room fails to render, the page keeps its painted backdrop instead of breaking. */
class HallErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Canvas set up like the game's (Game3DCanvas): the device's quality profile, one shadow caster, the ambient frame rate. */
function RealmHallCanvasHost() {
  const { profile } = useRenderQuality();
  const reduceMotion = useReducedMotion() ?? false;
  const [antialias] = useState(() => resolveAntialias(profile, window.devicePixelRatio));
  const glOptions = useMemo(() => getGameCanvasGlOptions({ antialias }), [antialias]);
  const shadows = useMemo(() => (profile.shadows ? { enabled: true, type: SHADOW_CONFIG.TYPE, autoUpdate: false } : false), [profile.shadows]);
  const dpr = useMemo<[number, number]>(() => [1, Math.min(profile.dprMax, REALM_HALL.MAX_DPR)], [profile.dprMax]);
  return (
    <>
      <Canvas
        frameloop="demand"
        shadows={shadows}
        dpr={dpr}
        gl={glOptions}
        camera={CAMERA}
      >
        <FrameScheduler ambientFps={profile.ambientFps}>
          <RealmHallScene still={reduceMotion} />
        </FrameScheduler>
      </Canvas>
      <div className="absolute inset-0" style={{ background: VIGNETTE_OVERLAY.BACKGROUND }} />
    </>
  );
}

/**
 * The live realm room behind the start page, fixed to the viewport. Load it with next/dynamic and
 * ssr: false; RealmHallBackdrop paints underneath until it renders, and stays when WebGL is
 * missing.
 */
export function RealmHallCanvas() {
  const webgl = useSyncExternalStore(noSubscribe, hasWebGL, () => false);
  if (!webgl) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <HallErrorBoundary>
        <RenderQualityProvider adaptive>
          <RealmHallCanvasHost />
        </RenderQualityProvider>
      </HallErrorBoundary>
    </div>
  );
}
