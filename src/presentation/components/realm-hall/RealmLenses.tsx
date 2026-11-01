'use client';

import { useSeasonalPack } from '@/presentation/components/settings/useSeasonalPack';
import { REALM_OPTIONS } from '../room-browser/realm-switcher.config';
import { RealmGlyphIcon } from '../room-browser/realm-mascots';
import { HALL_LOADER } from '@/presentation/config/realm-hall.config';
import { switchRealm } from './hall-loading-store';


/**
 * The realm lenses at the hall's door: one round lens per realm, painted with that realm's felt
 * and wood. Choosing one re-dresses the hall, the page and later the game (ThemeProvider and the
 * table theme follow the saved settings). A row on phones, a rail down the left edge from lg.
 */
export function RealmLenses({ className = '' }: { className?: string }) {
  const { settings, applyPack, isPackActive } = useSeasonalPack();
  const active = settings ? REALM_OPTIONS.find((realm) => isPackActive(realm.pack)) : undefined;
  return (
    <div className={`flex flex-col items-center lg:items-start gap-2 ${className}`}>
      <div role="group" aria-label="Realm" className="flex lg:flex-col flex-wrap justify-center gap-1.5 lg:gap-2">
        {REALM_OPTIONS.map((realm) => {
          const isActive = active?.pack.id === realm.pack.id;
          return (
            <button
              key={realm.pack.id}
              type="button"
              onClick={() => switchRealm(() => applyPack(realm.pack), { target: realm.pack.name, curtainMs: HALL_LOADER.CURTAIN_MS, minVisibleMs: HALL_LOADER.MIN_VISIBLE_MS })}
              aria-pressed={isActive}
              aria-label={`${realm.pack.name} realm: ${realm.pack.tagline}`}
              title={realm.pack.name}
              className="group relative w-11 h-11 rounded-full cursor-pointer transition-transform duration-200 motion-safe:hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle at 50% 45%, ${realm.table.felt.center} 0%, ${realm.table.felt.base} 48%, ${realm.table.felt.edge} 62%, ${realm.table.wood.base} 64%, ${realm.table.wood.molding} 100%)`,
                  boxShadow: isActive
                    ? `0 0 0 2px ${realm.table.accent.outerRing}, 0 0 18px ${realm.table.accent.outerRing}`
                    : 'inset 0 0 0 1px rgba(0,0,0,0.5), 0 3px 10px rgba(0,0,0,0.5)',
                }}
              />
              <span className="relative flex items-center justify-center w-full h-full scale-75">
                <RealmGlyphIcon glyph={realm.glyph} animate={false} />
              </span>
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="text-xs text-amber-100 text-center lg:text-left max-w-[16rem] [text-shadow:0_1px_3px_rgba(0,0,0,0.95),0_0_10px_rgba(0,0,0,0.8)] font-serif">
        {active ? <><span className="text-amber-100">{active.pack.name}</span> · {active.pack.tagline}</> : ' '}
      </p>
    </div>
  );
}
