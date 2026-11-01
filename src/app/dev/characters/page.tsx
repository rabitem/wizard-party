import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CharacterViewer } from './CharacterViewer';

// Checks the character assets: every part and clip, without accounts or unlocks. Served in local
// dev and on Vercel preview deployments, never on the production site.
const IS_SERVED = process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview';

export const metadata: Metadata = {
  title: 'Characters (dev)',
  robots: { index: false, follow: false },
};

export default function CharactersPage() {
  if (!IS_SERVED) notFound();
  return <CharacterViewer />;
}
