import type { DeviceTier } from '@/presentation/config/seasonal-ambience.config';

/** Cheap capability hints the browser exposes. */
export interface DeviceSignals {
  cores?: number;
  memoryGb?: number;
  coarsePointer: boolean;
  saveData?: boolean;
}

const LOW_CORES = 2;
const LOW_MEMORY_GB = 2;
const MOBILE_LOW_MEMORY_GB = 3;
const DESKTOP_MID_CORES = 4;

/** Map device hints to a quality tier (low = old phones / data saver, high = desktops). */
export function resolveDeviceTier(signals: DeviceSignals): DeviceTier {
  const { cores, memoryGb, coarsePointer, saveData } = signals;
  if (saveData) return 'low';
  if ((cores !== undefined && cores <= LOW_CORES) || (memoryGb !== undefined && memoryGb <= LOW_MEMORY_GB)) {
    return 'low';
  }
  if (coarsePointer) {
    // iOS exposes no deviceMemory, so phones are judged by memory only when it is known.
    return memoryGb !== undefined && memoryGb <= MOBILE_LOW_MEMORY_GB ? 'low' : 'mid';
  }
  if (cores !== undefined && cores <= DESKTOP_MID_CORES) return 'mid';
  return 'high';
}

interface NavigatorHints {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

/** Read the hints in the browser (safe defaults where an API is missing). */
export function readDeviceSignals(): DeviceSignals {
  const nav = navigator as Navigator & NavigatorHints;
  return {
    cores: nav.hardwareConcurrency || undefined,
    memoryGb: nav.deviceMemory,
    coarsePointer: typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches,
    saveData: nav.connection?.saveData,
  };
}
