'use client';

import { memo } from 'react';
import { Check } from 'lucide-react';
import { NewBadge } from '@/presentation/components/settings/NewBadge';
import type { SeasonalThemePack } from '@/presentation/components/settings/seasonal-theme-packs';
import { RealmGlyphIcon } from './realm-mascots';
import { RealmPreview } from './RealmPreview';
import type { RealmOption } from './realm-switcher.config';

interface RealmTileProps {
  realm: RealmOption;
  isActive: boolean;
  /** Show the "New" badge (only while the seasonal promo runs) */
  showNewBadge: boolean;
  animateMascot: boolean;
  onSelect: (pack: SeasonalThemePack) => void;
}

/** One realm in the home screen switcher: a mini preview of that look rendered in its own colors. */
function RealmTileView({ realm, isActive, showNewBadge, animateMascot, onSelect }: RealmTileProps) {
  const { pack, ui } = realm;
  return (
    <button
      type="button"
      data-realm={pack.id}
      onClick={() => onSelect(pack)}
      aria-pressed={isActive}
      aria-label={`${pack.name} look: ${pack.tagline}${isActive ? ' (active)' : ''}`}
      title={pack.tagline}
      className="group relative shrink-0 snap-start w-[128px] sm:w-[148px] rounded-xl border p-1.5 text-left cursor-pointer transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
      style={{
        // Always a dark tile tinted by the theme: light themes (winter, manga paper) would wash out the label and badge
        background: `linear-gradient(160deg, color-mix(in srgb, ${ui.accent} 18%, #0d0b09) 0%, color-mix(in srgb, ${ui.background} 25%, #0a0908) 100%)`,
        borderColor: isActive ? pack.color : `${pack.color}40`,
        boxShadow: isActive ? `0 0 0 2px ${pack.color}, 0 6px 20px ${pack.color}40` : '0 4px 14px rgba(0,0,0,0.35)',
      }}
    >
      <div
        className="relative aspect-[3/2] rounded-lg overflow-hidden"
        style={{ background: `color-mix(in srgb, ${ui.background} 40%, #0b0a09)` }}
      >
        <RealmPreview realm={realm} />
        <span className="absolute bottom-1 right-2 flex items-center justify-center">
          <RealmGlyphIcon glyph={realm.glyph} animate={animateMascot} />
        </span>
        {showNewBadge && realm.isNew ? <NewBadge className="absolute top-1 left-1 text-[8px]! px-1! py-px!" /> : null}
        {isActive ? (
          <span
            className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center shadow"
            style={{ background: pack.color }}
          >
            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <div className="px-1 pt-1.5 pb-0.5">
        <span className="block text-sm leading-tight truncate" style={{ fontFamily: 'Georgia, serif', color: pack.color }}>
          {pack.name}
        </span>
        <span
          className="block text-[10px] leading-tight truncate opacity-70"
          style={{ fontFamily: 'Georgia, serif', color: ui.primary }}
        >
          {isActive ? 'Active realm' : pack.tagline}
        </span>
      </div>
    </button>
  );
}

export const RealmTile = memo(RealmTileView);
