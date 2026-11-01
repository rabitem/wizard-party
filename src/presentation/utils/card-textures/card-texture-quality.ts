import * as THREE from 'three';
import {
  CARD_MEMORY_TIER,
  CARD_TEXTURE_QUALITY,
  CARD_TEXTURE_TIERS,
  type CardTextureTier,
  type CardTextureTierSpec,
} from '@/presentation/config/card-render.config';

/** The navigator fields the memory tier is derived from (all optional: SSR, Node, old browsers) */
interface CardTierEnvironment {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
  /** Chromium only; WebKit and Firefox do not report it */
  deviceMemory?: number;
}

function isAppleMobile({ userAgent = '', platform = '', maxTouchPoints = 0 }: CardTierEnvironment): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true;
  // iPadOS reports a Mac platform; only the touch points give it away.
  return platform === 'MacIntel' && maxTouchPoints > 1;
}

/**
 * Memory tier for card textures: iOS (WebKit caps total canvas memory and jetsam reloads the
 * tab under pressure, and it reports no deviceMemory) and devices reporting little memory get
 * the compact tier.
 */
function detectCardTextureTier(env: CardTierEnvironment): CardTextureTier {
  if (isAppleMobile(env)) return 'compact';
  if (typeof env.deviceMemory === 'number' && env.deviceMemory <= CARD_MEMORY_TIER.LOW_MEMORY_GB) return 'compact';
  return 'standard';
}

let detectedTier: CardTextureTier | null = null;

function readEnvironment(): CardTierEnvironment {
  if (typeof navigator === 'undefined') return {};
  const nav = navigator as Navigator & { deviceMemory?: number };
  return { userAgent: nav.userAgent, platform: nav.platform, maxTouchPoints: nav.maxTouchPoints, deviceMemory: nav.deviceMemory };
}

/** Tier of this device, detected once per page */
export function getCardTextureTier(): CardTextureTier {
  detectedTier ??= detectCardTextureTier(readEnvironment());
  return detectedTier;
}

export function getCardTextureTierSpec(tier: CardTextureTier = getCardTextureTier()): CardTextureTierSpec {
  return CARD_TEXTURE_TIERS[tier];
}

// ============== ANISOTROPY ==============

let rendererMaxAnisotropy = 1;
const qualityListeners = new Set<() => void>();

function getCardTextureAnisotropy(): number {
  return Math.max(1, Math.min(CARD_TEXTURE_QUALITY.MAX_ANISOTROPY, rendererMaxAnisotropy));
}

/** Colour space and filtering every card texture (face or back) is created with */
export function applyCardTextureQuality(texture: THREE.Texture): void {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = getCardTextureAnisotropy();
}

/**
 * Record the renderer's anisotropy limit (gl.capabilities.getMaxAnisotropy()). Idempotent, so
 * scene components may call it while rendering; when the limit rises, cached card textures are
 * re-filtered once (anisotropy only takes effect on upload).
 */
export function setCardTextureMaxAnisotropy(maxAnisotropy: number): void {
  if (!Number.isFinite(maxAnisotropy) || maxAnisotropy <= rendererMaxAnisotropy) return;
  const before = getCardTextureAnisotropy();
  rendererMaxAnisotropy = maxAnisotropy;
  if (getCardTextureAnisotropy() !== before) qualityListeners.forEach((listener) => listener());
}

/** Caches subscribe here to re-filter textures they created before the renderer was known */
export function onCardTextureQualityChange(listener: () => void): () => void {
  qualityListeners.add(listener);
  return () => qualityListeners.delete(listener);
}

/** Re-apply the current quality to an already uploaded texture */
export function refreshCardTextureQuality(texture: THREE.Texture): void {
  if (texture.anisotropy === getCardTextureAnisotropy()) return;
  applyCardTextureQuality(texture);
  texture.needsUpdate = true;
}
