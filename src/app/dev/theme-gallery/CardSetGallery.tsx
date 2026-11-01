'use client';

import { useEffect, useRef } from 'react';
import { CARD_THEMES, type CardTheme } from '@/presentation/components/settings';
import { GalleryLabel, GallerySection } from './gallery-section';
import { drawCardFace, getGalleryCardSpecs, type GalleryCardSpec } from './card-face-render';

const CARD_WIDTH_PX = { normal: 96, large: 200 } as const;

function CardFaceCanvas({ theme, spec, width }: { theme: CardTheme; spec: GalleryCardSpec; width: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    // Canvas drawing must happen in the browser after mount.
    if (canvasRef.current) drawCardFace(canvasRef.current, theme, spec);
  }, [theme, spec]);
  return (
    <canvas ref={canvasRef} title={spec.label} aria-label={spec.label} role="img"
      className="rounded shadow-lg" style={{ width, height: 'auto' }} />
  );
}

const GALLERY_CARD_SPECS = getGalleryCardSpecs();

function CardSetRow({ theme, large }: { theme: CardTheme; large: boolean }) {
  const width = large ? CARD_WIDTH_PX.large : CARD_WIDTH_PX.normal;
  return (
    <div data-card-theme={theme.id} className="space-y-2">
      <GalleryLabel name={`${theme.name} (${theme.id})`} isNew={theme.isNew} />
      <p className="text-xs text-amber-500/60">{theme.description}</p>
      <div className="flex flex-wrap gap-2">
        {GALLERY_CARD_SPECS.map((spec) => <CardFaceCanvas key={spec.key} theme={theme} spec={spec} width={width} />)}
      </div>
    </div>
  );
}

export function CardSetGallery({ onlyThemeId }: { onlyThemeId?: string }) {
  const themes = onlyThemeId ? CARD_THEMES.filter((theme) => theme.id === onlyThemeId) : CARD_THEMES;
  return (
    <GallerySection id="cards" title="Card Sets">
      {themes.length === 0 ? <p className="text-sm text-red-300">Unknown card theme: {onlyThemeId}</p> : null}
      <div className="space-y-8">
        {themes.map((theme) => <CardSetRow key={theme.id} theme={theme} large={Boolean(onlyThemeId)} />)}
      </div>
    </GallerySection>
  );
}
