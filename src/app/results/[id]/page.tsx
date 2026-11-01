import type { Metadata } from 'next';
import { ResultsClient } from './results-client';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Results - Game ${id} - Wizard Party`,
    description: 'View the final results of your Wizard Party game.',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function ResultsPage({ params }: Props) {
  const { id } = await params;

  return <ResultsClient roomId={id} />;
}
