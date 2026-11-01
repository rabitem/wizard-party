'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CONSTANTS } from '@/presentation/config/constants';

interface TableReadySignalProps {
  onReady: () => void;
}

/**
 * Reports once the table has drawn frames the player can actually see. While part of the scene
 * suspends (Rapier's WASM, a texture), React hides the canvas with display: none and frames
 * still render into it, so only frames drawn while the canvas is laid out count. Must be inside Canvas.
 */
export function TableReadySignal({ onReady }: TableReadySignalProps) {
  const canvas = useThree((state) => state.gl.domElement);
  const visibleFramesRef = useRef(0);
  const reportedRef = useRef(false);

  useFrame(() => {
    if (reportedRef.current) return;
    if (canvas.getClientRects().length === 0) {
      visibleFramesRef.current = 0;
      return;
    }
    visibleFramesRef.current += 1;
    if (visibleFramesRef.current < CONSTANTS.TABLE_LOADING.READY_FRAMES) return;
    reportedRef.current = true;
    onReady();
  });

  return null;
}
