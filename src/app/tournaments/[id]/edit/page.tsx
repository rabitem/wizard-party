import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { isTournamentId } from '@shared/domain/tournament';

import { EditTournamentView } from '@/presentation/components/tournament';

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: 'Edit tournament',
  robots: { index: false, follow: false },
};

export default async function EditTournamentPage({ params }: Props) {
  const { id } = await params;
  if (!isTournamentId(id)) notFound();
  return <EditTournamentView tournamentId={id} />;
}
