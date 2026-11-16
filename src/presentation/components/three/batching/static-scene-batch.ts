import type * as THREE from 'three';
import { buildStaticBatch, disposeStaticBatch, type StaticBatchResult } from './static-batch';
import { markReplacedMesh, restoreReplacedMesh } from './replaced-meshes';

/** Mutable GPU ownership stays outside React; only explicitly declared static roots participate. */
export class StaticSceneBatchCoordinator {
  private readonly roots = new Set<THREE.Group>();
  private dirty = true;
  private batch: StaticBatchResult | null = null;

  register(root: THREE.Group): () => void {
    this.roots.add(root); this.dirty = true;
    return () => { this.roots.delete(root); this.dirty = true; };
  }

  update(root: THREE.Group): boolean {
    if (!this.dirty) return false;
    this.dirty = false;
    this.clear();
    this.batch = buildStaticBatch(root, mesh => {
      for (let parent = mesh.parent; parent && parent !== root; parent = parent.parent) {
        if (this.roots.has(parent as THREE.Group)) return true;
      }
      return false;
    });
    for (const source of this.batch.sources) { source.visible = false; markReplacedMesh(source); }
    for (const mesh of this.batch.meshes) root.add(mesh);
    root.updateMatrixWorld(true);
    return true;
  }

  private clear(): void {
    if (!this.batch) return;
    for (const source of this.batch.sources) { source.visible = true; restoreReplacedMesh(source); }
    for (const mesh of this.batch.meshes) mesh.removeFromParent();
    disposeStaticBatch(this.batch);
    this.batch = null;
  }

  dispose(): void { this.clear(); this.roots.clear(); }
}
