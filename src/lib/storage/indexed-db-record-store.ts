/**
 * Minimal promise wrapper around one IndexedDB object store with out-of-line string keys.
 * No dependency: the app only needs get/getAll/put/delete on a single store.
 *
 * Every failure (IndexedDB missing or blocked, open rejected, transaction aborted, quota) rejects
 * the returned promise; callers decide whether that is worth telling the player about.
 */

/** Async key-value records; the IndexedDB adapter below and in-memory fakes in tests implement it. */
export interface AsyncRecordStore<T> {
  get(key: string): Promise<T | undefined>;
  getAll(): Promise<T[]>;
  getAllKeys(): Promise<string[]>;
  put(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

const DB_VERSION = 1;

function defaultIndexedDbFactory(): IDBFactory | null {
  try {
    return typeof indexedDB === 'undefined' ? null : indexedDB;
  } catch {
    // Accessing indexedDB throws SecurityError where site data is blocked.
    return null;
  }
}

export class IndexedDbRecordStore<T> implements AsyncRecordStore<T> {
  private database: Promise<IDBDatabase> | null = null;

  constructor(
    private readonly databaseName: string,
    private readonly storeName: string,
    private readonly factory: () => IDBFactory | null = defaultIndexedDbFactory
  ) {}

  get(key: string): Promise<T | undefined> {
    return this.request('readonly', (store) => store.get(key) as IDBRequest<T | undefined>);
  }

  getAll(): Promise<T[]> {
    return this.request('readonly', (store) => store.getAll() as IDBRequest<T[]>);
  }

  async getAllKeys(): Promise<string[]> {
    const keys = await this.request('readonly', (store) => store.getAllKeys());
    return keys.filter((key): key is string => typeof key === 'string');
  }

  async put(key: string, value: T): Promise<void> {
    await this.request('readwrite', (store) => store.put(value, key));
  }

  async delete(key: string): Promise<void> {
    await this.request('readwrite', (store) => store.delete(key));
  }

  private async request<R>(mode: IDBTransactionMode, operate: (store: IDBObjectStore) => IDBRequest<R>): Promise<R> {
    const database = await this.open();
    return new Promise<R>((resolve, reject) => {
      // transaction() throws synchronously when the connection is closing; the executor turns
      // that into a rejection.
      const transaction = database.transaction(this.storeName, mode);
      const request = operate(transaction.objectStore(this.storeName));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error ?? request.error);
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    });
  }

  private open(): Promise<IDBDatabase> {
    if (!this.database) {
      const opening = this.openDatabase();
      // A failed open is retried on the next call (e.g. after a blocked upgrade clears).
      opening.catch(() => {
        if (this.database === opening) this.database = null;
      });
      this.database = opening;
    }
    return this.database;
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const factory = this.factory();
      if (!factory) {
        reject(new Error('IndexedDB is not available'));
        return;
      }
      const request = factory.open(this.databaseName, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(this.storeName)) database.createObjectStore(this.storeName);
      };
      request.onsuccess = () => {
        const database = request.result;
        // Another tab upgrading the schema: step aside and reopen on the next request.
        database.onversionchange = () => {
          database.close();
          this.database = null;
        };
        resolve(database);
      };
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
      request.onblocked = () => reject(new Error('IndexedDB open blocked'));
    });
  }
}

/** In-memory AsyncRecordStore: the fallback where IndexedDB is unusable, and a test double. */
export class MemoryRecordStore<T> implements AsyncRecordStore<T> {
  private readonly records = new Map<string, T>();

  async get(key: string): Promise<T | undefined> {
    return this.records.get(key);
  }

  async getAll(): Promise<T[]> {
    return [...this.records.values()];
  }

  async getAllKeys(): Promise<string[]> {
    return [...this.records.keys()];
  }

  async put(key: string, value: T): Promise<void> {
    this.records.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.records.delete(key);
  }
}
