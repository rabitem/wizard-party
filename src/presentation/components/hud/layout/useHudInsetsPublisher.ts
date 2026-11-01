'use client';

import { useEffect, type RefObject } from 'react';
import { getHudInsetsFromRects, hudInsetsStore } from '@/presentation/hooks/layout/hud-insets-store';

/**
 * Publishes the screen insets the HUD reserves: the distance from each edge of the HUD root to
 * the free stage cell. Re-measured whenever the root, the stage or any region resizes.
 */
export function useHudInsetsPublisher(
  rootRef: RefObject<HTMLElement | null>,
  stageRef: RefObject<HTMLElement | null>,
  layoutKey: string,
): void {
  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage || typeof ResizeObserver === 'undefined') return undefined;

    const publish = () => {
      hudInsetsStore.set(getHudInsetsFromRects(root.getBoundingClientRect(), stage.getBoundingClientRect()));
    };
    const observer = new ResizeObserver(publish);
    observer.observe(root);
    observer.observe(stage);
    root.querySelectorAll('[data-hud-region]').forEach((region) => observer.observe(region));

    return () => {
      observer.disconnect();
      hudInsetsStore.reset();
    };
  }, [rootRef, stageRef, layoutKey]);
}
