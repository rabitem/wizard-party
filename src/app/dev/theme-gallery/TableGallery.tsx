import { TABLE_THEME_PALETTES, type TableThemePalette } from '@/presentation/config/table-theme.config';
import { GalleryLabel, GallerySection } from './gallery-section';

const TABLE_PREVIEW_SIZE = 220;

/** Top-down felt preview: wood rim, leather rail, radial felt and stitched accent rings. */
function TablePreview({ palette }: { palette: TableThemePalette }) {
  const { felt, accent, wood, leather } = palette;
  return (
    <svg viewBox="0 0 200 200" width={TABLE_PREVIEW_SIZE} height={TABLE_PREVIEW_SIZE} role="img" aria-label={palette.name}>
      <defs>
        <radialGradient id={`felt-${palette.id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={felt.center} />
          <stop offset="55%" stopColor={felt.base} />
          <stop offset="100%" stopColor={felt.edge} />
        </radialGradient>
        <radialGradient id={`wood-${palette.id}`} cx="50%" cy="45%" r="55%">
          <stop offset="80%" stopColor={wood.base} />
          <stop offset="100%" stopColor={wood.apron} />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="98" fill={`url(#wood-${palette.id})`} />
      <circle cx="100" cy="100" r="88" fill="none" stroke={wood.molding} strokeWidth="3" />
      <circle cx="100" cy="100" r="84" fill={leather.base} />
      <circle cx="100" cy="100" r="78" fill={`url(#felt-${palette.id})`} />
      <circle cx="100" cy="100" r="72" fill="none" stroke={accent.outerRing} strokeWidth="1.5" />
      <circle cx="100" cy="100" r="68" fill="none" stroke={felt.stitch} strokeWidth="1" strokeDasharray="3 3" />
      <circle cx="100" cy="100" r="40" fill="none" stroke={accent.innerRing} strokeWidth="1.2" strokeDasharray="4 2" />
    </svg>
  );
}

export function TableGallery() {
  return (
    <GallerySection id="tables" title="Tables">
      <div className="flex flex-wrap gap-6">
        {TABLE_THEME_PALETTES.map((palette) => (
          <div key={palette.id} data-table-theme={palette.id} className="flex flex-col items-center gap-2">
            <TablePreview palette={palette} />
            <GalleryLabel name={`${palette.name} (${palette.id})`} isNew={palette.isNew} />
          </div>
        ))}
      </div>
    </GallerySection>
  );
}
