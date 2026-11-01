'use client';

import { useSyncExternalStore } from 'react';

import { equippedCosmetics, type AvatarFrameId } from '@shared/domain/account';

import { AVATAR_PRESETS, loadGameSettings } from '@/presentation/components/settings';
import { getOrCreatePlayerId } from '@/presentation/hooks/connection/utils';
import { useAccount } from '@/presentation/providers/AccountProvider';

import { AVATAR_FACE_BG, GLOW_SHADOW } from './account-surfaces';
import { FRAME_STYLES } from './cosmetic-styles';
import { guestAvatarId } from './guest-avatar';

const AVATAR_IDS = AVATAR_PRESETS.map((preset) => preset.id);

function subscribe(callback: () => void) {
  window.addEventListener('settings-changed', callback);
  return () => window.removeEventListener('settings-changed', callback);
}

/**
 * The local player's avatar. Choosing one comes with an account (Profile tab, synced like every
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
const ICON: Record<PlayerAvatarSize, string> = { xs: 'text-[11px]', sm: 'text-base', md: 'text-lg', lg: 'text-3xl', xl: 'text-4xl sm:text-5xl' };
const RING: Record<PlayerAvatarSize, string> = { xs: 'p-px', sm: 'p-[2px]', md: 'p-[2px]', lg: 'p-[3px]', xl: 'p-1' };

export interface PlayerAvatarProps {
  /** Preset id; defaults to the avatar chosen in the local settings. */
  avatarId?: string;
  size?: PlayerAvatarSize;
  /** Explicit frame cosmetic. Takes precedence over `level`. */
  frameId?: AvatarFrameId;
  /** Shows the highest frame unlocked at this level. */
  level?: number;
  /** Adds the active theme's glow around the avatar (header cards). */
  glow?: boolean;
}

export function PlayerAvatar({ avatarId, size = 'md', frameId, level, glow = false }: PlayerAvatarProps) {
  const current = useAvatarId();
  const preset = AVATAR_PRESETS.find((avatar) => avatar.id === (avatarId ?? current)) ?? AVATAR_PRESETS[0];
  const frame = FRAME_STYLES[frameId ?? (level ? equippedCosmetics(level).frameId : 'plain')] ?? FRAME_STYLES.plain;
  const boxShadow = glow ? `${frame.glow}, ${GLOW_SHADOW}` : frame.glow;

  if (!frame.ring) {
    return (
      <span
        className={`${BOX[size]} ${ICON[size]} shrink-0 rounded-full border-2 border-amber-600/50 inline-flex items-center justify-center text-amber-300`}
        style={{ background: AVATAR_FACE_BG, boxShadow }}
        aria-label={preset.label}
        role="img"
      >
        <i className={`ra ${preset.icon}`} aria-hidden />
      </span>
    );
  }

  return (
    <span className={`${BOX[size]} ${RING[size]} relative shrink-0 rounded-full inline-flex overflow-hidden`} style={{ boxShadow }} aria-label={preset.label} role="img">
      <span
        aria-hidden
        className={`absolute inset-[-25%] ${frame.animated ? 'animate-[spin_8s_linear_infinite] motion-reduce:animate-none' : ''}`}
        style={{ background: frame.ring }}
      />
      <span className={`${ICON[size]} relative w-full h-full rounded-full inline-flex items-center justify-center text-amber-300`} style={{ background: `${AVATAR_FACE_BG}, var(--page-base)` }}>
        <i className={`ra ${preset.icon}`} aria-hidden />
      </span>
    </span>
  );
}
