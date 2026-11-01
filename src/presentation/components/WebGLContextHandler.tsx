'use client';

import { Component, useCallback, useEffect, useReducer, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import { useFrame, useThree, type RootState } from '@react-three/fiber';
import { GRAPHICS_LIFECYCLE } from '@/presentation/config/render-quality.config';
import {
  graphicsLifecycleReducer,
  initialGraphicsLifecycle,
  rebuildDelayMs,
  type GraphicsLifecycleEvent,
  type GraphicsLifecycleState,
} from './three/graphics-lifecycle/graphics-lifecycle';
import { probeGraphics } from './three/render-quality/graphics-probe';

/**
 * R3F's setFrameloop restarts the scene clock at 0, and every useFrame animation (card flights,
 * collections, physics) measures its progress on that clock: a card in the air would jump back to
 * its start. Keep the elapsed time, so the frozen span is skipped and the scene resumes where it stopped.
 */
function setFrameloopKeepingTime(get: RootState['get'], frameloop: RootState['frameloop']): void {
  const { clock, setFrameloop } = get();
  const elapsed = clock.elapsedTime;
  setFrameloop(frameloop);
  clock.elapsedTime = elapsed;
}

interface WebGLContextHandlerProps {
  onContextLost: () => void;
  onContextRestored: () => void;
  /** Called once per renderer (and after each restore) when a frame has rendered */
  onFrameRendered: () => void;
}

/**
 * Real GPU context loss only (webglcontextlost on the game canvas). The scene stays mounted
 * with its frame loop paused; three.js re-creates its GPU state on webglcontextrestored and
 * re-uploads resources lazily, so the restored context is used in place. Must be inside Canvas.
 */
export function WebGLContextHandler({ onContextLost, onContextRestored, onFrameRendered }: WebGLContextHandlerProps) {
  const gl = useThree((state) => state.gl);
  const get = useThree((state) => state.get);
  const invalidate = useThree((state) => state.invalidate);
  const renderedRef = useRef(false);

  useEffect(() => {
    const canvas = gl.domElement;
    const handleLost = (event: Event) => {
      // Without preventDefault the browser never restores the context
      event.preventDefault();
      console.warn('[WebGL] Context lost; waiting for the browser to restore it');
      setFrameloopKeepingTime(get, 'never');
      onContextLost();
    };
    const handleRestored = () => {
      renderedRef.current = false;
      setFrameloopKeepingTime(get, 'demand');
      invalidate();
      onContextRestored();
    };
    canvas.addEventListener('webglcontextlost', handleLost);
    canvas.addEventListener('webglcontextrestored', handleRestored);
    return () => {
      canvas.removeEventListener('webglcontextlost', handleLost);
      canvas.removeEventListener('webglcontextrestored', handleRestored);
    };
  }, [gl, get, invalidate, onContextLost, onContextRestored]);

  useFrame(() => {
    if (renderedRef.current) return;
    renderedRef.current = true;
    onFrameRendered();
  });

  return null;
}

interface WebGLErrorBoundaryProps {
  children: ReactNode;
  onError: () => void;
}

/**
 * Catches errors thrown while rendering the 3D scene (including failed WebGL context creation),
 * so a crash rebuilds the canvas with back-off instead of taking down the game UI. The error is
 * still reported (console.error reaches the client error telemetry).
 */
export class WebGLErrorBoundary extends Component<WebGLErrorBoundaryProps, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[WebGL] 3D scene crashed:', error, errorInfo.componentStack);
    this.props.onError();
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

const lifecycleReducer = (state: GraphicsLifecycleState, event: GraphicsLifecycleEvent) =>
  graphicsLifecycleReducer(state, event);

/** Graphics lifecycle state machine (see graphics-lifecycle.ts) with its timers. */
export function useGraphicsLifecycle() {
  const [initial] = useState<GraphicsLifecycleState>(() => initialGraphicsLifecycle(probeGraphics().webgl2));
  const [state, dispatch] = useReducer(lifecycleReducer, initial);

  useEffect(() => {
    if (state.status === 'lost') {
      const timer = setTimeout(() => dispatch({ type: 'restore-timeout' }), GRAPHICS_LIFECYCLE.RESTORE_TIMEOUT_MS);
      return () => clearTimeout(timer);
    }
    if (state.status === 'rebuilding') {
      const timer = setTimeout(() => dispatch({ type: 'rebuild' }), rebuildDelayMs(state.attempts));
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [state.status, state.attempts]);

  const handleContextLost = useCallback(() => dispatch({ type: 'context-lost' }), []);
  const handleContextRestored = useCallback(() => dispatch({ type: 'context-restored' }), []);
  const handleFrameRendered = useCallback(() => dispatch({ type: 'frame-rendered' }), []);
  const handleRenderError = useCallback(() => dispatch({ type: 'render-error' }), []);
  const retry = useCallback(() => dispatch({ type: 'manual-retry' }), []);

  return { state, handleContextLost, handleContextRestored, handleFrameRendered, handleRenderError, retry };
}
