import type { AccountDocumentKey } from '@shared/application/use-cases/account';
import type { AccountDocument } from '@shared/application/ports/account';

import { safeLocalStorage } from '../storage';
import { AccountApiError, accountApi } from './account-api';

/**
 * Adapter between one locally stored setting and its account document. The engine never knows
 * what a document contains; adding a synced setting means writing one slice.
 */
export interface SyncSlice<T = unknown> {
  key: AccountDocumentKey;
  /** Current local value, in the exact shape that is synced. */
  read(): T;
  /** Writes a value coming from the account into local storage (and notifies the app). */
  apply(remote: unknown): void;
  subscribe(onChange: () => void): () => void;
}

interface SyncedState {
  version: number;
  /** Serialized value at the last successful sync, to detect local edits. */
  snapshot: string;
}

type Api = Pick<typeof accountApi, 'documents' | 'saveDocument'>;

const PUSH_DEBOUNCE_MS = 1_000;

/**
 * Local-first settings sync. localStorage stays the app's source of truth at runtime; the
 * engine reconciles it with the account:
 * - on start, local edits made while offline are pushed, otherwise the account copy wins;
 * - afterwards every local change is pushed (debounced) with optimistic concurrency;
 * - on a version conflict the newest local intent is re-applied on top of the current version.
 */
export class SettingsSyncEngine {
  private readonly stateKey: string;
  private readonly timers = new Map<AccountDocumentKey, ReturnType<typeof setTimeout>>();
  private unsubscribers: (() => void)[] = [];
  private stopped = false;

  constructor(
    userId: string,
    private readonly slices: readonly SyncSlice[],
    private readonly api: Api = accountApi
  ) {
    this.stateKey = `wizard-party-account-sync:${userId}`;
  }

  async start(): Promise<void> {
    await this.reconcile();
    if (this.stopped) return;
    this.unsubscribers = this.slices.map((slice) => slice.subscribe(() => this.schedulePush(slice)));
  }

  /** Pulls changes made on other devices; also called when the tab becomes visible again. */
  async reconcile(): Promise<void> {
    const { documents } = await this.api.documents();
    if (this.stopped) return;
    const remote = new Map(documents.map((document) => [document.key, document]));
    const state = this.loadState();

    await Promise.all(
      this.slices.map(async (slice) => {
        const local = JSON.stringify(slice.read());
        const document = remote.get(slice.key);
        const synced = state[slice.key];
        if (!document) return this.push(slice, 0);

        const editedOffline = synced && synced.version === document.version && synced.snapshot !== local;
        if (editedOffline) return this.push(slice, document.version);
        this.applyRemote(slice, document);
      })
    );
  }

  stop(): void {
    this.stopped = true;
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
  }

  private schedulePush(slice: SyncSlice): void {
    const pending = this.timers.get(slice.key);
    if (pending) clearTimeout(pending);
    this.timers.set(
      slice.key,
      setTimeout(() => {
        this.timers.delete(slice.key);
        void this.push(slice);
      }, PUSH_DEBOUNCE_MS)
    );
  }

  private async push(slice: SyncSlice, knownVersion?: number, retried = false): Promise<void> {
    const value = slice.read();
    const snapshot = JSON.stringify(value);
    const state = this.loadState();
    const synced = state[slice.key];
    if (knownVersion === undefined && synced?.snapshot === snapshot) return;

    try {
      const { document } = await this.api.saveDocument(slice.key, value, knownVersion ?? synced?.version ?? 0);
      this.saveState(slice.key, { version: document.version, snapshot });
    } catch (error) {
      const current = error instanceof AccountApiError && error.status === 409
        ? ((error.body as { current?: AccountDocument | null } | undefined)?.current ?? null)
        : undefined;
      if (current !== undefined && !retried && !this.stopped) {
        return this.push(slice, current?.version ?? 0, true);
      }
      console.warn(`[account] could not sync ${slice.key}`, error);
    }
  }

  private applyRemote(slice: SyncSlice, document: AccountDocument): void {
    if (JSON.stringify(slice.read()) !== JSON.stringify(document.data)) slice.apply(document.data);
    // Store what the slice holds after normalization, so it is not mistaken for a local edit.
    this.saveState(slice.key, { version: document.version, snapshot: JSON.stringify(slice.read()) });
  }

  private loadState(): Partial<Record<AccountDocumentKey, SyncedState>> {
    const state = safeLocalStorage.readJson(this.stateKey);
    return state && typeof state === 'object' ? state as Partial<Record<AccountDocumentKey, SyncedState>> : {};
  }

  private saveState(key: AccountDocumentKey, value: SyncedState): void {
    // Without persisted state the next start simply lets the account copy win.
    safeLocalStorage.writeJson(this.stateKey, { ...this.loadState(), [key]: value });
  }
}
