import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  COLLECT_ANIMATION,
  seededRandom,
} from "../../config/physics.config";
import {
  cancelDeferredUnmountCompletion,
  scheduleDeferredUnmountCompletion,
  type DeferredUnmountHandle,
} from "./deferred-unmount-completion";
import type { CollectionAnimationProfile } from "../../config/collection-animation.config";
import { getCollectingFlyDuration } from "./collecting-card-animation";
import type { PhaseOffsets } from "./collecting-card-frame-animation";

/** Generate random offsets for card animation variation */
export function useRandomOffsets(cardId: string): PhaseOffsets {
  return useMemo(() => {
    const rand = seededRandom(cardId);
    const jitter = COLLECT_ANIMATION.DURATION_JITTER;
    return { gatherWobbleX: (rand() - 0.5) * 0.08, gatherWobbleZ: (rand() - 0.5) * 0.08, gatherArcMultiplier: 0.85 + rand() * 0.3,
      flyArcMultiplier: 0.9 + rand() * 0.2, flySpinZ: (rand() - 0.5) * 0.3, durationMult: 1 - jitter + rand() * jitter * 2, seedAngle: rand() * Math.PI * 2 };
  }, [cardId]);
}

interface DurationParams {
  startPos: [number, number, number];
  centerPos: [number, number, number];
  targetPos: [number, number, number];
  stackedY: number;
  gatherMult: number;
  /** The card's duration jitter */
  durationMult: number;
  profile: CollectionAnimationProfile;
}

/** Calculate distance-aware durations (gather paced per trick, flight per card variant) */
export function useDurations({ startPos, centerPos, targetPos, stackedY, gatherMult, durationMult, profile }: DurationParams) {
  return useMemo(() => {
    const start = new THREE.Vector3(...startPos), center = new THREE.Vector3(...centerPos), target = new THREE.Vector3(...targetPos);
    target.y = stackedY;
    const gatherClamped = THREE.MathUtils.clamp(start.distanceTo(center) / COLLECT_ANIMATION.GATHER_SPEED, COLLECT_ANIMATION.GATHER_DURATION_MIN, COLLECT_ANIMATION.GATHER_DURATION_MAX);
    return {
      gatherDuration: gatherClamped * gatherMult,
      flyDuration: getCollectingFlyDuration(center.distanceTo(target), durationMult, profile),
    };
  }, [startPos, centerPos, targetPos, stackedY, gatherMult, durationMult, profile]);
}

/** Hook for unmount cleanup to ensure onComplete is called */
export function useUnmountCleanup(completedRef: React.MutableRefObject<boolean>, onCompleteRef: React.MutableRefObject<(() => void) | undefined>) {
  const timeoutRef = useRef<DeferredUnmountHandle | null>(null);

  useEffect(() => {
    cancelDeferredUnmountCompletion(timeoutRef);

    return () => {
      // React strict-effects cleanup is followed by an immediate setup. Deferring lets that setup cancel false completions.
      scheduleDeferredUnmountCompletion({ completedRef, onCompleteRef, timeoutRef });
    };
  }, [completedRef, onCompleteRef]);
}
