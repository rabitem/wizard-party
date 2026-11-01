'use client';

import dynamic from 'next/dynamic';

// The sandbox patches browser timers before the game mounts, so it never renders on the server.
const SandboxApp = dynamic(() => import('./sandbox-app').then((mod) => mod.SandboxApp), {
  ssr: false,
  loading: () => null,
});

export function AnimationSandboxClient() {
  return <SandboxApp />;
}
