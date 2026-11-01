'use client';

import { useSyncExternalStore } from 'react';
import { DEVICE_TIER, type DeviceTier } from '@/presentation/config/realism.config';

export interface DeviceSignals {
  /** navigator.hardwareConcurrency (0 when unknown) */
  cores: number;
  /** navigator.deviceMemory in GB (0 when unknown) */
  memoryGb: number;
  /** Primary input is touch (phones, tablets) */
  coarsePointer: boolean;
  devicePixelRatio: number;
}

/** Pure tier decision so it can be unit tested. */
export function resolveDeviceTier({ cores, memoryGb, coarsePointer, devicePixelRatio }: DeviceSignals): DeviceTier {
  const fewCores = cores > 0 && cores <= DEVICE_TIER.LOW_CORES;
  const lowMemory = memoryGb > 0 && memoryGb <= DEVICE_TIER.LOW_MEMORY_GB;
  // Touch devices are conservative: only clearly capable phones/tablets
  // (8+ cores, memory not known to be low) leave the low tier. This also keeps
  // bloom off on most phones (PostProcessing skips it on 'low').
  if (coarsePointer) return cores >= DEVICE_TIER.HIGH_CORES && !lowMemory ? 'medium' : 'low';
  if (fewCores || lowMemory) return 'medium';
  // Retina laptops with plenty of cores; very high dpr desktops pay more per pixel.
  if (cores >= DEVICE_TIER.HIGH_CORES || cores === 0) return devicePixelRatio > 2 ? 'medium' : 'high';
  return 'medium';
}

function readSignals(): DeviceSignals {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    cores: nav.hardwareConcurrency ?? 0,
    memoryGb: nav.deviceMemory ?? 0,
    coarsePointer: typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches,
    devicePixelRatio: window.devicePixelRatio || 1,
  };
}

let cachedTier: DeviceTier | null = null;

/** Device tier for the current browser (cached; 'medium' during SSR). */
export function getDeviceTier(): DeviceTier {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'medium';
  cachedTier ??= resolveDeviceTier(readSignals());
  return cachedTier;
}

const noopSubscribe = () => () => {};
const serverTier = (): DeviceTier => 'medium';

/** React hook form of getDeviceTier (stable for the session). */
export function useDeviceTier(): DeviceTier {
  return useSyncExternalStore(noopSubscribe, getDeviceTier, serverTier);
}
