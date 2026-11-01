import type { Metadata, Viewport } from 'next';
import { GameClient } from './game-client';

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * The game fills the whole screen edge to edge (merged over the root viewport). Its HUD regions
 * and sheets pad themselves with env(safe-area-inset-*), so notches and the home indicator never
 * cover controls (docs/client/hud-layout.md). Other pages keep the default letterboxed viewport.
 */
export const viewport: Viewport = {
  viewportFit: 'cover',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Game ${id} - Wizard Party`,
    description: 'Playing Wizard Party - A magical multiplayer trick-taking card game.',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function GamePage({ params }: Props) {
  const { id } = await params;

  return <GameClient roomId={id} />;
}
