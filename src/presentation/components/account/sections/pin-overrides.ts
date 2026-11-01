/**
 * Pin changes made in this tab on top of server data, keyed by clientGameId. Shared by every
 * list (overview, history) so a pin set in one view shows in the other without a refetch.
 *
 * Server data wins once it is newer than a change: an entry is dropped when a list loads data
 * requested after the change was confirmed (`reconcile`). Changes still in flight are kept, and
 * the whole store is scoped to one account, so another user's pins never leak into a session.
 */
interface PinOverride {
  pinnedAt: number | null;
  /** True while the request is running (optimistic value). */
  pending: boolean;
  /** Store sequence when the server confirmed the change. */
  confirmedAt: number;
  /** What a failed request falls back to. */
  previous?: PinOverride;
}

export interface PinnableGame {
  clientGameId: string;
  pinnedAt: number | null;
}

export class PinOverrideStore {
  private owner: string | null = null;
  private readonly overrides = new Map<string, PinOverride>();
  private readonly listeners = new Set<() => void>();
  private sequence = 0;
  private version = 0;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getVersion = (): number => this.version;

  /** Marker to take before requesting server data; pass it to `reconcile` with the response. */
  checkpoint(): number {
    return this.sequence;
  }

  /** Current pin time of a game for this user, including changes made in this tab. */
  pinnedAt(userId: string | null, game: PinnableGame): number | null {
    if (userId === null || userId !== this.owner) return game.pinnedAt;
    const override = this.overrides.get(game.clientGameId);
    return override ? override.pinnedAt : game.pinnedAt;
  }

  /** Optimistic value while the request runs. */
  begin(userId: string, clientGameId: string, pinnedAt: number | null): void {
    this.claim(userId);
    const current = this.overrides.get(clientGameId);
    const previous = current?.pending ? current.previous : current;
    this.overrides.set(clientGameId, { pinnedAt, pending: true, confirmedAt: this.sequence, previous });
    this.notify();
  }

  /** The server accepted the change. */
  confirm(userId: string, clientGameId: string, pinnedAt: number | null): void {
    if (userId !== this.owner) return;
    this.sequence++;
    this.overrides.set(clientGameId, { pinnedAt, pending: false, confirmedAt: this.sequence });
    this.notify();
  }

  /** The request failed: back to the last confirmed state. */
  revert(userId: string, clientGameId: string): void {
    if (userId !== this.owner) return;
    const previous = this.overrides.get(clientGameId)?.previous;
    if (previous) this.overrides.set(clientGameId, previous);
    else this.overrides.delete(clientGameId);
    this.notify();
  }

  /**
   * Fresh server data for these games arrived. Overrides confirmed before the request started
   * (`checkpoint`) are already part of it, or were changed elsewhere since, so they go.
   */
  reconcile(clientGameIds: Iterable<string>, checkpoint: number): void {
    let changed = false;
    for (const id of clientGameIds) {
      const override = this.overrides.get(id);
      if (!override) continue;
      if (!override.pending && override.confirmedAt <= checkpoint) {
        this.overrides.delete(id);
        changed = true;
      } else if (override.pending && override.previous && override.previous.confirmedAt <= checkpoint) {
        // A failing request then falls back to the fresh server data, not the older change.
        override.previous = undefined;
      }
    }
    if (changed) this.notify();
  }

  private claim(userId: string): void {
    if (this.owner === userId) return;
    this.owner = userId;
    this.overrides.clear();
  }

  private notify(): void {
    this.version++;
    this.listeners.forEach((listener) => listener());
  }
}

/** The tab-wide store used by the account screens. */
export const pinOverrides = new PinOverrideStore();
