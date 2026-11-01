import type { StorageFaultMode } from './sandbox-step.types';

type Restore = () => void;

/** Shadows a read-only getter (navigator.onLine, document.visibilityState) with an own property. */
function overrideGetter<T extends object, K extends keyof T>(target: T, key: K, value: T[K]): Restore {
  const own = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, { configurable: true, get: () => value });
  return () => {
    if (own) Object.defineProperty(target, key, own);
    else delete (target as Record<PropertyKey, unknown>)[key as PropertyKey];
  };
}

function storageError(mode: Exclude<StorageFaultMode, 'off'>): DOMException {
  return mode === 'quota'
    ? new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    : new DOMException('Access to storage is denied (private mode or blocked site data).', 'SecurityError');
}

const STORAGE_METHODS = ['getItem', 'setItem', 'removeItem', 'clear', 'key'] as const;
/** Quota faults only reject writes; a full store still reads. */
const QUOTA_METHODS: ReadonlySet<string> = new Set(['setItem']);

/**
 * Browser-level faults a player's device produces: going offline, a hidden tab, storage that
 * throws (Safari private mode, blocked site data, a full quota) and a lost WebGL context. Every
 * fault is reverted by reset(), which a run calls before it builds its report.
 */
export class BrowserFaults {
  private readonly restores = new Map<string, Restore>();

  /** navigator.onLine plus the `offline` / `online` event the page listens for. */
  setOnline(online: boolean): void {
    this.revert('online');
    if (!online) this.restores.set('online', overrideGetter(navigator, 'onLine', false));
    window.dispatchEvent(new Event(online ? 'online' : 'offline'));
  }

  /** document.visibilityState / hidden plus the visibilitychange event (a backgrounded tab). */
  setVisibility(state: 'hidden' | 'visible'): void {
    this.revert('visibility');
    if (state === 'hidden') {
      const restoreState = overrideGetter(document, 'visibilityState', 'hidden');
      const restoreHidden = overrideGetter(document, 'hidden', true);
      this.restores.set('visibility', () => {
        restoreState();
        restoreHidden();
      });
    }
    document.dispatchEvent(new Event('visibilitychange'));
  }

  /** Makes localStorage and sessionStorage throw like a locked-down browser does. */
  setStorageFault(mode: StorageFaultMode): void {
    this.revert('storage');
    if (mode === 'off') return;
    const prototype = Storage.prototype as unknown as Record<string, unknown>;
    const originals = new Map(STORAGE_METHODS.map((method) => [method, prototype[method]]));
    for (const method of STORAGE_METHODS) {
      if (mode === 'quota' && !QUOTA_METHODS.has(method)) continue;
      prototype[method] = () => {
        throw storageError(mode);
      };
    }
    this.restores.set('storage', () => {
      for (const [method, original] of originals) prototype[method] = original;
    });
  }

  /**
   * Loses the WebGL context like a GPU reset or memory pressure does. Returns the restore
   * function, or null when the context offers no WEBGL_lose_context.
   */
  loseContext(context: WebGLRenderingContext | WebGL2RenderingContext): (() => void) | null {
    const extension = context.getExtension('WEBGL_lose_context') as { loseContext(): void; restoreContext(): void } | null;
    if (!extension) return null;
    extension.loseContext();
    const restore = () => {
      this.restores.delete('context');
      extension.restoreContext();
    };
    this.restores.set('context', restore);
    return restore;
  }

  /** Reverts every fault still in place. */
  reset(): void {
    for (const key of [...this.restores.keys()]) this.revert(key);
  }

  private revert(key: string): void {
    const restore = this.restores.get(key);
    this.restores.delete(key);
    restore?.();
  }
}
