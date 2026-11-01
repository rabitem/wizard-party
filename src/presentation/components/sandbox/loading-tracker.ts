import * as THREE from 'three';

type ItemHook = (url: string) => void;

interface TrackableManager {
  itemStart: ItemHook;
  itemEnd: ItemHook;
}

/**
 * Counts assets three.js loaders are still fetching (textures, environment maps, models) through
 * the default LoadingManager every loader (and drei's hooks) reports to. A snapshot waits for
 * zero before it renders its settle frames, so baselines never catch a texture half way in.
 *
 * Loads are counted per URL: a load that started before the tracker was installed ends without
 * a start it saw, and must not cancel a load the tracker is still waiting for.
 */
export class LoadingTracker {
  private readonly inFlight = new Map<string, number>();
  private pending = 0;
  private readonly restore: () => void;

  constructor(manager: TrackableManager = THREE.DefaultLoadingManager) {
    const { itemStart, itemEnd } = manager;
    manager.itemStart = (url) => {
      this.inFlight.set(url, (this.inFlight.get(url) ?? 0) + 1);
      this.pending++;
      itemStart.call(manager, url);
    };
    // Loaders call itemEnd after itemError too, so only itemEnd settles an item.
    manager.itemEnd = (url) => {
      this.settle(url);
      itemEnd.call(manager, url);
    };
    this.restore = () => {
      manager.itemStart = itemStart;
      manager.itemEnd = itemEnd;
    };
  }

  get pendingLoads(): number {
    return this.pending;
  }

  dispose(): void {
    this.restore();
    this.inFlight.clear();
    this.pending = 0;
  }

  private settle(url: string): void {
    const count = this.inFlight.get(url);
    if (count === undefined) return;
    if (count > 1) this.inFlight.set(url, count - 1);
    else this.inFlight.delete(url);
    this.pending--;
  }
}
