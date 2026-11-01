import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ThemeGallery } from './ThemeGallery';

// Screenshot page for every theme preset: served in local dev and on Vercel preview
// deployments, never on the production site.
const IS_SERVED = process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview';

export const metadata: Metadata = {
  title: 'Theme Gallery (dev)',
  robots: { index: false, follow: false },
};

export default function ThemeGalleryPage() {
  if (!IS_SERVED) notFound();
  return (
    <Suspense fallback={null}>
      <ThemeGallery />
    </Suspense>
  );
}
