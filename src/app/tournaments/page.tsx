import type { Metadata } from 'next';
import { Suspense } from 'react';

import { TournamentsView } from '@/presentation/components/tournament';

export const metadata: Metadata = {
  title: 'Tournaments',
  description: 'Host and play Wizard Party tournaments: real tables round after round, live standings, a champion, trophies and XP.',
};

export default function TournamentsPage() {
  return (
    <Suspense>
      <TournamentsView />
    </Suspense>
  );
}
