import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { isTournamentId } from '@shared/domain/tournament';

import { TournamentPageView } from '@/presentation/components/tournament';

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Viewer-aware and live (polled), so the page itself is a static client shell. Names are not put
 * into metadata: private tournaments must not leak through link previews.
 */
export const metadata: Metadata = {
  title: 'Tournament',
  robots: { index: false, follow: false },
};

export default async function TournamentPage({ params }: Props) {
  const { id } = await params;
  if (!isTournamentId(id)) notFound();
  return (
    <Suspense>
      <TournamentPageView tournamentId={id} />
    </Suspense>
  );
}
