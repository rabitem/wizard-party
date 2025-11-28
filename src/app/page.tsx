'use client';

import dynamic from 'next/dynamic';

const GameScene = dynamic(
  () => import('@/presentation/scenes/GameScene').then((mod) => mod.GameScene),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-zinc-700 border-t-violet-500 rounded-full animate-spin" />
          <div className="text-zinc-400 text-sm">Loading game...</div>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  return <GameScene />;
}
