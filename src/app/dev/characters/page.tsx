import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CharacterViewer } from './CharacterViewer';
import { CHARACTER_DEV_PAGES_SERVED } from './dev-only';

// Checks the character assets: every part and clip.

export const metadata: Metadata = {
  title: 'Characters (dev)',
  robots: { index: false, follow: false },
};

export default function CharactersPage() {
  if (!CHARACTER_DEV_PAGES_SERVED) notFound();
  return <CharacterViewer />;
}
