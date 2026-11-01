'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Optional diagnostics rendered inside the game Canvas.
 *
 * R3F bridges React context into the Canvas tree, so tools such as the animation
 * sandbox can mount per-frame probes without threading props through the scene.
 * Production renders nothing here.
 */
const SceneProbeContext = createContext<ReactNode>(null);

export function SceneProbeProvider({ probe, children }: { probe: ReactNode; children: ReactNode }) {
  return <SceneProbeContext.Provider value={probe}>{children}</SceneProbeContext.Provider>;
}

export function SceneProbeSlot() {
  return <>{useContext(SceneProbeContext)}</>;
}
