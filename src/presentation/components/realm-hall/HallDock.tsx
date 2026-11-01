'use client';

import { motion, useReducedMotion } from 'motion/react';
import { AccountButton, PreferencesButton } from '../account';
import { SocialButton } from '../friends';
import { ProfileSearch } from './ProfileSearch';
import { useHideOnScrollDown } from './useHideOnScrollDown';

/**
 * The start page's top-right dock: the player search, friends, preferences and the account in one
 * capsule of the realm's surface, each a borderless segment. The capsule animates its width when a
 * segment arrives (friends appear once the account has loaded), so the row never jumps. On phones
 * it slides away while scrolling down, so it never covers a heading.
 */
export function HallDock() {
  const reduceMotion = useReducedMotion();
  const hidden = useHideOnScrollDown();
  return (
    <motion.nav
      aria-label="Account"
      layout={!reduceMotion}
      animate={{ y: hidden ? -88 : 0, opacity: hidden ? 0 : 1 }}
      transition={{ type: 'spring', damping: 30, stiffness: 340 }}
      className="fixed top-3 right-3 sm:top-5 sm:right-5 z-30 flex items-center gap-0.5 p-1 rounded-full border border-[var(--surface-border)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] backdrop-blur-md shadow-[0_8px_28px_rgba(0,0,0,0.45)]"
    >
      <ProfileSearch />
      <SocialButton />
      <PreferencesButton />
      <AccountButton />
    </motion.nav>
  );
}
