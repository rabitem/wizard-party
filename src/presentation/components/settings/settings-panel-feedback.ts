export type SettingsFeedbackAction =
  | 'sound-selection'
  | 'custom-role'
  | 'shared-import'
  | 'rename'
  | 'remove';

export interface SettingsFeedbackParticle {
  id: string;
  x: number;
  y: number;
  rotate: number;
  delayMs: number;
  durationMs: number;
  color: string;
}

const SETTINGS_OVERLAY_ROOT_CLASS = 'fixed inset-0 z-[60] pointer-events-none';
const SETTINGS_BACKDROP_CLASS = 'absolute inset-0 bg-black/80 backdrop-blur-sm pointer-events-auto';
const SETTINGS_PANEL_BASE_CLASS = 'absolute z-10 overflow-hidden pointer-events-auto';
const SETTINGS_PANEL_DESKTOP_CLASS = 'right-0 top-0 bottom-0 w-full max-w-md';
const SETTINGS_PANEL_MOBILE_CLASS = 'inset-x-0 bottom-0 rounded-t-2xl max-h-[90vh]';

const SETTINGS_FEEDBACK_COLORS = [
  '#fbbf24',
  '#f59e0b',
  '#22c55e',
  '#38bdf8',
  '#f472b6',
] as const;

export function getSettingsBackdropClass(): string {
  return SETTINGS_BACKDROP_CLASS;
}

export function getSettingsOverlayRootClass(): string {
  return SETTINGS_OVERLAY_ROOT_CLASS;
}

export function getSettingsPanelClass(isMobile: boolean): string {
  return `${SETTINGS_PANEL_BASE_CLASS} ${isMobile ? SETTINGS_PANEL_MOBILE_CLASS : SETTINGS_PANEL_DESKTOP_CLASS}`;
}

function hashFeedbackSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nextParticleValue(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

export function createSettingsFeedbackParticles(seed: string, count = 10): SettingsFeedbackParticle[] {
  let value = hashFeedbackSeed(seed);

  return Array.from({ length: count }, (_, index) => {
    value = nextParticleValue(value);
    const spread = (value % 100) / 100;
    value = nextParticleValue(value);
    const lift = (value % 100) / 100;
    value = nextParticleValue(value);

    return {
      id: `settings-feedback-${index}`,
      x: Math.round((spread - 0.5) * 140),
      y: -Math.round(24 + lift * 64),
      rotate: value % 180,
      delayMs: index * 18,
      durationMs: 520 + (value % 120),
      color: SETTINGS_FEEDBACK_COLORS[index % SETTINGS_FEEDBACK_COLORS.length],
    };
  });
}

export function shouldTriggerSettingsFeedback(action: SettingsFeedbackAction): boolean {
  return action === 'sound-selection' ||
    action === 'custom-role' ||
    action === 'shared-import';
}
