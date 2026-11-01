import { useRef, useEffect, MutableRefObject } from 'react';
import { RapierRigidBody } from '@react-three/rapier';
import { REST_DETECTION } from '../../config/rapier.config';
import { isVelocityAtRest, hasCardFallen, zeroVelocities } from './physics-utils';

export interface UseCardRestDetectionOptions {
  /** Reference to the rigid body */
  rigidBodyRef: MutableRefObject<RapierRigidBody | null>;
  /** Callback when card comes to rest */
  onRest?: () => void;
  /** Callback when card wakes from rest */
  onWake?: () => void;
}

export interface UseCardRestDetectionResult {
  /** Check if card is currently sleeping */
  isSleeping: () => boolean;
  /** Wake the card from sleep state */
  wakeUp: () => void;
  /** Force the card to sleep state */
  sleep: () => void;
  /** Reset rest detection state (call on collision) */
  resetOnCollision: () => void;
}

/**
 * Hook for managing card rest detection with hysteresis to prevent jitter.
 * Monitors card velocity and transitions between rest/wake states.
 */
export function useCardRestDetection({
  rigidBodyRef,
  onRest,
  onWake,
}: UseCardRestDetectionOptions): UseCardRestDetectionResult {
  // Rest detection state with hysteresis
  const restCheckRef = useRef(0);
  const wasAtRestRef = useRef(false);
  const lastStateChangeRef = useRef(0);
  const isSleepingRef = useRef(false);

  // Enhanced rest state detection with hysteresis to prevent jitter
  useEffect(() => {
    // Skip if no callbacks registered
    if (!onRest && !onWake) return;

    const checkRest = () => {
      if (!rigidBodyRef.current) return;

      // Skip if already sleeping (completely at rest)
      if (isSleepingRef.current) return;

      const now = Date.now();
      const vel = rigidBodyRef.current.linvel();
      const angVel = rigidBodyRef.current.angvel();

      // Check if card has fallen off table
      const pos = rigidBodyRef.current.translation();
      if (hasCardFallen(pos.y)) {
        // Card fell off table, reset state
        restCheckRef.current = 0;
        wasAtRestRef.current = false;
        return;
      }

      // Use hysteresis: different thresholds for entering vs leaving rest state
      const isCurrentlyStill = isVelocityAtRest(vel, angVel, wasAtRestRef.current);

      if (isCurrentlyStill) {
        restCheckRef.current++;

        // Check if we've been at rest long enough
        if (restCheckRef.current >= REST_DETECTION.FRAMES_UNTIL_REST && !wasAtRestRef.current) {
          // Debounce: don't change state too quickly
          if (now - lastStateChangeRef.current > REST_DETECTION.REST_DEBOUNCE_MS) {
            wasAtRestRef.current = true;
            lastStateChangeRef.current = now;

            // Enter sleep mode - zero out velocities for stability
            isSleepingRef.current = true;
            zeroVelocities(rigidBodyRef.current);

            onRest?.();
          }
        }
      } else if (wasAtRestRef.current) {
        // Card was at rest but now moving - wake up
        if (now - lastStateChangeRef.current > REST_DETECTION.REST_DEBOUNCE_MS) {
          wasAtRestRef.current = false;
          restCheckRef.current = 0;
          lastStateChangeRef.current = now;
          onWake?.();
        }
      } else {
        // Card is moving and wasn't at rest - reset rest counter
        restCheckRef.current = 0;
      }
    };

    const interval = setInterval(checkRest, REST_DETECTION.CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [rigidBodyRef, onRest, onWake]);

  return {
    isSleeping: () => isSleepingRef.current,

    wakeUp: () => {
      if (rigidBodyRef.current && isSleepingRef.current) {
        isSleepingRef.current = false;
        wasAtRestRef.current = false;
        restCheckRef.current = 0;
        rigidBodyRef.current.wakeUp();
      }
    },

    sleep: () => {
      if (rigidBodyRef.current && !isSleepingRef.current) {
        isSleepingRef.current = true;
        zeroVelocities(rigidBodyRef.current);
      }
    },

    resetOnCollision: () => {
      if (isSleepingRef.current) {
        isSleepingRef.current = false;
        wasAtRestRef.current = false;
        restCheckRef.current = 0;
      }
    },
  };
}
