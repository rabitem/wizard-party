/**
 * Orders the GAME_STATE snapshots of one socket by their `stateVersion` (protocol 2): a snapshot
 * older than the one already applied is stale and must not roll the table back. Snapshots without
 * a version (older servers, in-browser transports) are always applied. Versions repeat for direct
 * answers (a state request, a resent command), so an equal version is not stale.
 */
export class SnapshotOrder {
  private applied: number | null = null;

  /** True when the snapshot should be applied; records its version when it is. */
  accept(stateVersion: unknown): boolean {
    if (typeof stateVersion !== 'number' || !Number.isFinite(stateVersion)) return true;
    if (this.applied !== null && stateVersion < this.applied) return false;
    this.applied = stateVersion;
    return true;
  }

  /** A new socket (or room) starts a new sequence. */
  reset(): void {
    this.applied = null;
  }
}
