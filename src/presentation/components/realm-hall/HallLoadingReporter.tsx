'use client';

import { useEffect } from 'react';
import { useProgress } from '@react-three/drei';
import { hallLoadingStore } from './hall-loading-store';

/**
 * Inside the canvas: reports the room as ready once it has settled and no texture is loading, and
 * as busy while a realm switch loads the next room. Lives here so the page's loader does not pull
 * three.js into the start page's first bundle.
 */
export function HallLoadingReporter({ settled }: { settled: boolean }) {
  const loading = useProgress((state) => state.active);

  useEffect(() => {
    if (settled && !loading) hallLoadingStore.setStatus('ready');
    hallLoadingStore.setBusy(settled && loading);
  }, [settled, loading]);

  useEffect(() => () => {
    hallLoadingStore.setBusy(false);
    hallLoadingStore.setStatus('loading');
  }, []);

  return null;
}
