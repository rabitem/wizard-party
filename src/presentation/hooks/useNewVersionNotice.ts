'use client';

import { useLayoutEffect, useSyncExternalStore } from 'react';

import { versionWatch } from '@/lib/version-watch';

/** Where a notice renders: inside the in-game HUD, or floating over any other page. */
export type VersionNoticePlacement = 'hud' | 'floating';

const never = () => false;

function reloadPage(): void {
  window.location.reload();
}

/**
 * Whether to show the "new version available" notice at this placement. Only one placement shows
 * it at a time: a mounted HUD claims it, and the floating banner yields while it does.
 */
export function useNewVersionNotice(placement: VersionNoticePlacement) {
  const available = useSyncExternalStore(versionWatch.subscribe, versionWatch.isAvailable, never);
  const dismissed = useSyncExternalStore(versionWatch.subscribe, versionWatch.isDismissed, never);
  const hostedInline = useSyncExternalStore(versionWatch.subscribe, versionWatch.hasInlineHost, never);

  // Layout effect: the claim lands before paint, so the floating banner never flashes over the HUD.
  useLayoutEffect(() => (placement === 'hud' ? versionWatch.claimInlineHost() : undefined), [placement]);

  const visible = available && !dismissed && (placement === 'hud' || !hostedInline);
  return { visible, reload: reloadPage, dismiss: versionWatch.dismiss };
}
