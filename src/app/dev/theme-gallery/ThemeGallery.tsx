'use client';

import { useSearchParams } from 'next/navigation';
import { CardSetGallery } from './CardSetGallery';
import { TableGallery } from './TableGallery';
import { UiThemeGallery } from './UiThemeGallery';
import { PackGallery } from './PackGallery';

const GALLERY_SECTIONS = ['cards', 'tables', 'ui', 'packs'] as const;
type GallerySectionId = (typeof GALLERY_SECTIONS)[number];

function parseSection(value: string | null): GallerySectionId | null {
  return GALLERY_SECTIONS.find((section) => section === value) ?? null;
}

/**
 * Query params:
 *  ?section=cards|tables|ui|packs  render one section only
 *  ?theme=<cardThemeId>            render a single card set large
 */
export function ThemeGallery() {
  const searchParams = useSearchParams();
  const section = parseSection(searchParams.get('section'));
  const cardThemeId = searchParams.get('theme');
  const show = (id: GallerySectionId) => section === null || section === id;

  return (
    <main className="min-h-screen bg-[#0d0b08] text-amber-100 p-6 space-y-10">
      {cardThemeId ? (
        <CardSetGallery onlyThemeId={cardThemeId} />
      ) : (
        <>
          {show('cards') ? <CardSetGallery /> : null}
          {show('tables') ? <TableGallery /> : null}
          {show('ui') ? <UiThemeGallery /> : null}
          {show('packs') ? <PackGallery /> : null}
        </>
      )}
    </main>
  );
}
