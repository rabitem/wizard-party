import { CARD_THEMES, THEME_PACKS, THEME_PRESETS } from '@/presentation/components/settings';
import { getTableTheme } from '@/presentation/config/table-theme.config';
import { GalleryLabel, GallerySection } from './gallery-section';

interface Swatch { id: string; color: string }

function PackPart({ label, name, swatches }: { label: string; name: string; swatches: Swatch[] }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-12 uppercase tracking-wider text-amber-500/60">{label}</span>
      <span className="flex-1 text-amber-100/90">{name}</span>
      {swatches.map((swatch) => (
        <span key={swatch.id} title={swatch.id} className="w-4 h-4 rounded border border-black/30" style={{ background: swatch.color }} />
      ))}
    </div>
  );
}

export function PackGallery() {
  return (
    <GallerySection id="packs" title="Theme Packs">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {THEME_PACKS.map((pack) => {
          const ui = THEME_PRESETS.find((theme) => theme.id === pack.theme);
          const table = getTableTheme(pack.tableTheme);
          const cards = CARD_THEMES.find((theme) => theme.id === pack.cardTheme);
          return (
            <div key={pack.id} data-pack={pack.id} className="rounded-lg p-4 space-y-3 border border-amber-800/40 bg-black/30">
              <div className="flex items-center gap-2">
                <i className={`ra ${pack.icon} text-2xl`} style={{ color: pack.color }} />
                <GalleryLabel name={pack.name} />
              </div>
              <p className="text-xs text-amber-500/70">{pack.tagline}</p>
              <PackPart label="UI" name={ui?.name ?? `missing: ${pack.theme}`}
                swatches={ui ? Object.entries(ui.colors).map(([id, color]) => ({ id, color })) : []} />
              <PackPart label="Table" name={table.name} swatches={[
                { id: 'felt', color: table.felt.base }, { id: 'ring', color: table.accent.outerRing }, { id: 'wood', color: table.wood.base },
              ]} />
              <PackPart label="Cards" name={cards?.name ?? `missing: ${pack.cardTheme}`}
                swatches={cards ? Object.entries(cards.suits).map(([id, suit]) => ({ id, color: suit.primary })) : []} />
            </div>
          );
        })}
      </div>
    </GallerySection>
  );
}
