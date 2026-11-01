/**
 * The outbox subset of Durable Object storage in memory (structured clones, sorted prefix
 * listing), for the telemetry and tournament result outboxes. Not part of the worker.
 */
import type { OutboxStorage } from '../telemetry';

export class MemoryOutboxStorage implements OutboxStorage {
  readonly data = new Map<string, unknown>();

  get<T>(key: string): Promise<T | undefined> {
    return Promise.resolve(this.data.get(key) as T | undefined);
  }

  put(entries: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(entries)) this.data.set(key, structuredClone(value));
    return Promise.resolve();
  }

  list<T>({ prefix, limit }: { prefix: string; limit: number }): Promise<Map<string, T>> {
    const keys = [...this.data.keys()].filter((key) => key.startsWith(prefix)).sort().slice(0, limit);
    return Promise.resolve(new Map(keys.map((key) => [key, this.data.get(key) as T])));
  }

  delete(keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) if (this.data.delete(key)) deleted++;
    return Promise.resolve(deleted);
  }
}
