'use client';

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { getShuffleSortDuration } from '../config/physics.config';

export type HandAnimationType = 'none' | 'shuffle' | 'sort';

export interface HandAnimationClock {
  animation: HandAnimationType;
  startedAt: number;
}

export const IDLE_HAND_ANIMATION_CLOCK: HandAnimationClock = { animation: 'none', startedAt: 0 };

/**
 * Restart the clock when the requested animation changes. The clock starts idle, so a
 * hand that mounts while an animation is already requested still runs it to completion.
 */
export function syncHandAnimationClock(clock: HandAnimationClock, animation: HandAnimationType, now: number): HandAnimationClock {
  if (animation === clock.animation) return clock;
  return { animation, startedAt: animation === 'none' ? 0 : now };
}

/** Progress 0..1 of the running animation, or null when the hand is idle. */
export function getHandAnimationProgress(clock: HandAnimationClock, cardCount: number, now: number): number | null {
  if (clock.animation === 'none') return null;
  return Math.min((now - clock.startedAt) / getShuffleSortDuration(clock.animation, cardCount), 1);
}

/**
 * Drives a shuffle/sort from the frame loop and reports progress to the owner of the
 * hand order. The hand is the only clock for these animations, so an animation still
 * running when the hand unmounts (round end, WebGL context-loss remount) is finished
 * on the way out instead of leaving shuffle and sort locked.
 */
export function useHandAnimationClock(
  animation: HandAnimationType,
  cardCount: number,
  onAnimationProgress?: (progress: number) => void
): number {
  const [animationProgress, setAnimationProgress] = useState(0);
  const clockRef = useRef<HandAnimationClock>(IDLE_HAND_ANIMATION_CLOCK);
  const latestRef = useRef({ animation, onAnimationProgress });

  useEffect(() => {
    latestRef.current = { animation, onAnimationProgress };
  }, [animation, onAnimationProgress]);

  useEffect(() => {
    const next = syncHandAnimationClock(clockRef.current, animation, performance.now());
    if (next === clockRef.current) return;
    clockRef.current = next;
    setAnimationProgress(0);
  }, [animation]);

  useFrame(() => {
    const progress = getHandAnimationProgress(clockRef.current, cardCount, performance.now());
    if (progress === null) return;
    if (progress !== animationProgress) setAnimationProgress(progress);
    onAnimationProgress?.(progress);
  });

  useEffect(() => () => {
    const latest = latestRef.current;
    if (latest.animation !== 'none') latest.onAnimationProgress?.(1);
  }, []);

  return animationProgress;
}
