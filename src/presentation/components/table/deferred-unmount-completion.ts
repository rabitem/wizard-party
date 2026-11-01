import type { MutableRefObject } from 'react';

export interface DeferredUnmountCompletionRefs {
  completedRef: MutableRefObject<boolean>;
  onCompleteRef: MutableRefObject<(() => void) | undefined>;
  timeoutRef: MutableRefObject<DeferredUnmountHandle | null>;
}

export type DeferredUnmountHandle = { cancelled: boolean };

export function cancelDeferredUnmountCompletion(
  timeoutRef: MutableRefObject<DeferredUnmountHandle | null>
): void {
  if (!timeoutRef.current) return;
  timeoutRef.current.cancelled = true;
  timeoutRef.current = null;
}

export function scheduleDeferredUnmountCompletion(refs: DeferredUnmountCompletionRefs): void {
  cancelDeferredUnmountCompletion(refs.timeoutRef);

  const handle: DeferredUnmountHandle = { cancelled: false };
  refs.timeoutRef.current = handle;
  queueMicrotask(() => {
    if (handle.cancelled) return;
    refs.timeoutRef.current = null;

    if (refs.completedRef.current) return;
    refs.completedRef.current = true;
    refs.onCompleteRef.current?.();
  });
}
