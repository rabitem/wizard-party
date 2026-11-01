import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CHARACTER_DEV_PAGES_SERVED } from '../dev-only';
import { PortraitSpriteStage } from './PortraitSpriteStage';

export const metadata: Metadata = {
  title: 'Portrait sprites (dev)',
  robots: { index: false, follow: false },
};

/** Driven by scripts/characters/render-portrait-sprites.mjs; renders nothing on its own. */
export default function PortraitSpritesPage() {
  if (!CHARACTER_DEV_PAGES_SERVED) notFound();
  return <PortraitSpriteStage />;
}
