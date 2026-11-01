import type { AvatarFrameId, ProfileBannerId } from '@shared/domain/account';

/*
 * Visual definitions of the level cosmetics (pure CSS, no images). The domain owns which
 * cosmetics exist and when they unlock; this file only says how each id looks.
 */

export interface FrameStyle {
  /** Ring fill behind the avatar; null renders the classic single amber border. */
  ring: string | null;
  glow: string;
  /** Slowly rotates the ring (disabled for prefers-reduced-motion). */
  animated?: boolean;
}

export const FRAME_STYLES: Record<AvatarFrameId, FrameStyle> = {
  plain: { ring: null, glow: '0 0 20px color-mix(in srgb, var(--glow) 50%, transparent)' },
  bronze: {
    ring: 'linear-gradient(135deg, #f0b27a 0%, #8c5a2b 45%, #d79a5c 70%, #5e3a18 100%)',
    glow: '0 0 16px rgba(205,127,50,0.35)',
  },
  silver: {
    ring: 'linear-gradient(135deg, #ffffff 0%, #9aa3ad 40%, #e7ecf1 65%, #6b737c 100%)',
    glow: '0 0 18px rgba(200,210,225,0.35)',
  },
  gold: {
    ring: 'linear-gradient(135deg, #fff3b0 0%, #d4a017 40%, #ffe27a 65%, #8a6508 100%)',
    glow: '0 0 22px rgba(240,190,60,0.45)',
  },
  arcane: {
    ring: 'conic-gradient(from 0deg, #7c3aed, #22d3ee, #a78bfa, #6366f1, #7c3aed)',
    glow: '0 0 24px rgba(139,92,246,0.5)',
    animated: true,
  },
  legendary: {
    ring: 'conic-gradient(from 0deg, #f59e0b, #ef4444, #f472b6, #fde047, #f97316, #f59e0b)',
    glow: '0 0 28px rgba(251,146,60,0.6), 0 0 8px rgba(253,224,71,0.6)',
    animated: true,
  },
};

export const BANNER_STYLES: Record<ProfileBannerId, string> = {
  parchment: 'linear-gradient(120deg, rgba(120,80,30,0.35) 0%, rgba(60,40,18,0.15) 60%, rgba(0,0,0,0) 100%)',
  ember: 'linear-gradient(120deg, rgba(194,65,12,0.45) 0%, rgba(120,40,10,0.2) 55%, rgba(0,0,0,0) 100%)',
  twilight: 'linear-gradient(120deg, rgba(79,70,229,0.4) 0%, rgba(124,58,237,0.2) 50%, rgba(0,0,0,0) 100%)',
  aurora: 'linear-gradient(120deg, rgba(16,185,129,0.38) 0%, rgba(34,211,238,0.22) 45%, rgba(124,58,237,0.12) 75%, rgba(0,0,0,0) 100%)',
  starfall:
    'radial-gradient(circle at 20% 30%, rgba(253,224,71,0.25) 0 2px, transparent 3px), radial-gradient(circle at 70% 60%, rgba(255,255,255,0.2) 0 1.5px, transparent 2.5px), linear-gradient(120deg, rgba(30,27,75,0.7) 0%, rgba(88,28,135,0.35) 55%, rgba(0,0,0,0) 100%)',
};
