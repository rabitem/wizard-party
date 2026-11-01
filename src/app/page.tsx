'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RoomBrowser } from '@/presentation/components/RoomBrowser';
import { useGame } from '@/presentation/providers/GameProvider';
import { LoadingOverlay } from '@/presentation/components/overlays';

function HomePageContent() {
  const router = useRouter();
  const { isConnected, gameState, sessionLoaded } = useGame();

  // If already connected to a game, redirect to the appropriate route
  useEffect(() => {
    if (isConnected && gameState) {
      router.replace(`/lobby/${gameState.id}`);
    }
  }, [isConnected, gameState, router]);

  // Show loading while session is being restored
  if (!sessionLoaded) {
    return <LoadingOverlay />;
  }

  // If connected, show loading while redirecting
  if (isConnected && gameState) {
    return <LoadingOverlay />;
  }

  return <RoomBrowser />;
}

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingOverlay />}>
      <HomePageContent />
    </Suspense>
  );
}
