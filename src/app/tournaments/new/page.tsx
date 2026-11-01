import type { Metadata } from 'next';

import { CreateTournamentView } from '@/presentation/components/tournament';

export const metadata: Metadata = {
  title: 'Host a tournament',
  robots: { index: false, follow: false },
};

export default function NewTournamentPage() {
  return <CreateTournamentView />;
}
