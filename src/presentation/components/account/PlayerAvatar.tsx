'use client';

import { useSyncExternalStore } from 'react';

import { equippedCosmetics, type AvatarFrameId } from '@shared/domain/account';
import type { CharacterAppearance } from '@shared/domain/character';

import { AVATAR_PRESETS, loadGameSettings } from '@/presentation/components/settings';
import { getOrCreatePlayerId } from '@/presentation/hooks/connection/utils';
import { useLocalAppearance } from '@/presentation/hooks/account/useLocalAppearance';
import { useAccount } from '@/presentation/providers/AccountProvider';
// By path: the character barrel also exports the 3D figure, which avatar-only pages never need.
import { CharacterFace } from '@/presentation/components/character/CharacterFace';

import { AVATAR_FACE_BG, GLOW_SHADOW } from './account-surfaces';
import { FRAME_STYLES } from './cosmetic-styles';
import { guestAvatarId } from './guest-avatar';

const AVATAR_IDS = AVATAR_PRESETS.map((preset) => preset.id);

function subscribe(callback: () => void) {
  window.addEventListener('settings-changed', callback);
  return () => window.removeEventListener('settings-changed', callback);
}

/**
 * The local player's avatar id (the sigil chosen before characters). Still read by the Profile
 * tab's picker, which feeds the derived character, and the seat mark on the 3D table. Choosing one comes with an account (Profile tab, synced like every
 * other setting); a guest gets one picked from their browser's player id.
 */
export function useAvatarId(): string {
  const { status } = useAccount();
  const chosen = useSyncExternalStore(subscribe, () => loadGameSettings().avatar, () => 'wizard');
  return status === 'guest' ? guestAvatarId(getOrCreatePlayerId(), AVATAR_IDS) : chosen;
}

/** xs fits inside a text-xs chip, so the chip stays as tall as the buttons next to it. */
export type PlayerAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const BOX: Record<PlayerAvatarSize, string> = { xs: 'w-5 h-5', sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-16 h-16', xl: 'w-20 h-20 sm:w-24 sm:h-24' };
const RING: Record<PlayerAvatarSize, string> = { xs: 'p-px', sm: 'p-[2px]', md: 'p-[2px]', lg: 'p-[3px]', xl: 'p-1' };

export interface PlayerAvatarProps {
  /**
   * The character to show. Left out: the local player's own (useLocalAppearance). null: a
   * silhouette, for guests and players whose look is unknown.
   */
  appearance?: CharacterAppearance | null;
  /** Accessible name, e.g. the player's name. */
  label?: string;
  size?: PlayerAvatarSize;
  /** Explicit frame cosmetic. Takes precedence over `level`. */
  frameId?: AvatarFrameId;
  /** Shows the highest frame unlocked at this level. */
  level?: number;
  /** Adds the active theme's glow around the avatar (header cards). */
  glow?: boolean;
}

export function PlayerAvatar({ appearance, label = 'Character', size = 'md', frameId, level, glow = false }: PlayerAvatarProps) {
  const own = useLocalAppearance();
  const look = appearance === undefined ? own : appearance;
  const frame = FRAME_STYLES[frameId ?? (level ? equippedCosmetics(level).frameId : 'plain')] ?? FRAME_STYLES.plain;
  const boxShadow = glow ? `${frame.glow}, ${GLOW_SHADOW}` : frame.glow;

  if (!frame.ring) {
    return (
      <span
        className={`${BOX[size]} shrink-0 rounded-full border-2 border-amber-600/50 inline-flex items-center justify-center overflow-hidden`}
        style={{ background: AVATAR_FACE_BG, boxShadow }}
      >
        <CharacterFace appearance={look} label={label} className="w-full h-full rounded-full" />
      </span>
    );
  }

  return (
    <span className={`${BOX[size]} ${RING[size]} relative shrink-0 rounded-full inline-flex overflow-hidden`} style={{ boxShadow }}>
      <span
        aria-hidden
        className={`absolute inset-[-25%] ${frame.animated ? 'animate-[spin_8s_linear_infinite] motion-reduce:animate-none' : ''}`}
        style={{ background: frame.ring }}
      />
      <span className="relative w-full h-full rounded-full inline-flex items-center justify-center overflow-hidden" style={{ background: `${AVATAR_FACE_BG}, var(--page-base)` }}>
        <CharacterFace appearance={look} label={label} className="w-full h-full rounded-full" />
      </span>
    </span>
  );
}
