'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useThree } from '@react-three/fiber';

interface WebGLContextHandlerProps {
  onContextLost?: () => void;
  onContextRestored?: () => void;
}

/**
 * Component that handles WebGL context loss and restoration.
 * Must be placed inside a Canvas component.
 */
export function WebGLContextHandler({ onContextLost, onContextRestored }: WebGLContextHandlerProps) {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('[WebGL] Context lost');
      onContextLost?.();
    };

    const handleContextRestored = () => {
      console.log('[WebGL] Context restored');
      onContextRestored?.();
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [gl, onContextLost, onContextRestored]);

  return null;
}

/**
 * Hook to manage WebGL context state outside of Canvas.
 * Returns state and handlers to pass to WebGLContextHandler.
 */
export function useWebGLContext(autoRecoverDelay = 1500) {
  const [contextLost, setContextLost] = useState(false);
  const [contextKey, setContextKey] = useState(0);
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const forceRecover = useCallback(() => {
    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current);
      recoveryTimeoutRef.current = null;
    }
    setContextLost(false);
    setContextKey((k) => k + 1);
  }, []);

  const handleContextLost = useCallback(() => {
    setContextLost(true);
    // Auto-recover after delay
    if (autoRecoverDelay > 0) {
      recoveryTimeoutRef.current = setTimeout(() => {
        forceRecover();
      }, autoRecoverDelay);
    }
  }, [autoRecoverDelay, forceRecover]);

  const handleContextRestored = useCallback(() => {
    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current);
      recoveryTimeoutRef.current = null;
    }
    setContextLost(false);
    // Increment key to force Canvas remount and re-create all resources
    setContextKey((k) => k + 1);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
      }
    };
  }, []);

  return {
    contextLost,
    contextKey,
    handleContextLost,
    handleContextRestored,
    forceRecover,
  };
}
