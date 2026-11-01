'use client';

import { useEffect } from 'react';

interface Disposable {
  dispose: () => void;
}

/** Disposes GPU resources created in useMemo when they change or unmount. */
export function useDisposables(resources: Readonly<Record<string, Disposable>>): void {
  useEffect(() => {
    const list = Object.values(resources);
    return () => list.forEach((resource) => resource.dispose());
  }, [resources]);
}
