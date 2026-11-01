'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { NewBadge } from '@/presentation/components/settings/NewBadge';
import { isSeasonalPromoRunning } from '@/presentation/components/settings/seasonal-theme-packs';
import { useSeasonalPack } from '@/presentation/components/settings/useSeasonalPack';
import { RealmTile } from './RealmTile';
import { REALM_OPTIONS, REALM_SWITCHER } from './realm-switcher.config';

/**
 * "Choose your realm": a swipeable row of live previews, one per look (Classic + seasonal and trend packs).
 * Selecting a tile saves theme, table and cards together; ThemeProvider recolors the page via 'settings-changed'.
 * The row is always shown; the "New" badges and waving mascots only appear while the seasonal promo
 * runs (CONSTANTS.SEASONAL_PROMO.ENDS_AT).
 */
export function RealmSwitcher() {
  const reduceMotion = useReducedMotion();
  const { settings, applyPack, isPackActive } = useSeasonalPack();
  const rowRef = useRef<HTMLDivElement>(null);
  const hasScrolledToActive = useRef(false);
  const promoRunning = isSeasonalPromoRunning();

  // Once settings load, bring the active realm into view without scrolling the page itself.
  useEffect(() => {
    const row = rowRef.current;
    if (!settings || !row || hasScrolledToActive.current) return;
    hasScrolledToActive.current = true;
    const active = REALM_OPTIONS.find((realm) => isPackActive(realm.pack));
    if (!active) return;
    const tile = row.querySelector<HTMLElement>(`[data-realm="${active.pack.id}"]`);
    if (!tile) return;
    const overflowRight = tile.offsetLeft + tile.offsetWidth - (row.scrollLeft + row.clientWidth);
    if (overflowRight > 0) row.scrollTo({ left: tile.offsetLeft - parseFloat(getComputedStyle(row).paddingLeft) });
  }, [settings, isPackActive]);

  return (
    <motion.section
      aria-labelledby="realm-switcher-heading"
      className="-mt-2 sm:-mt-4 mb-6 sm:mb-8"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: REALM_SWITCHER.ENTRANCE_DELAY_S }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/40" />
        <Sparkles className="w-3.5 h-3.5 text-amber-500/70" aria-hidden="true" />
        <h2
          id="realm-switcher-heading"
          className="text-xs text-amber-400/80 uppercase tracking-widest"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Choose your realm
        </h2>
        {promoRunning ? <NewBadge /> : null}
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/40" />
      </div>

      <div
        ref={rowRef}
        role="group"
        aria-label="Visual themes"
        className="relative flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4 -mx-4 px-4 sm:-mx-6 sm:px-6 sm:scroll-px-6 pt-1.5 pb-3 [scrollbar-width:thin] motion-safe:scroll-smooth"
      >
        {REALM_OPTIONS.map((realm) => (
          <RealmTile
            key={realm.pack.id}
            realm={realm}
            isActive={isPackActive(realm.pack)}
            showNewBadge={promoRunning}
            animateMascot={promoRunning ? !reduceMotion : false}
            onSelect={applyPack}
          />
        ))}
      </div>
    </motion.section>
  );
}
