function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function idOf(item: unknown): string | undefined {
  return isPlainObject(item) && typeof item.id === 'string' ? item.id : undefined;
}

/** Elements by id when every element has one (players, cards), so a removed card shifts nothing. */
function indexById(items: unknown[]): Map<string, unknown> | null {
  const byId = new Map<string, unknown>();
  for (const item of items) {
    const id = idOf(item);
    if (id === undefined) return null;
    byId.set(id, item);
  }
  return byId;
}

function shareArray(previous: unknown[], next: unknown[]): unknown[] {
  const previousById = indexById(previous);
  let same = previous.length === next.length;
  const result = next.map((item, index) => {
    const id = idOf(item);
    const candidate = previousById && id !== undefined ? previousById.get(id) : previous[index];
    const shared = replaceEqualDeep(candidate, item);
    if (shared !== previous[index]) same = false;
    return shared;
  });
  return same ? previous : result;
}

function shareObject(previous: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> {
  const nextKeys = Object.keys(next);
  let same = nextKeys.length === Object.keys(previous).length;
  const result: Record<string, unknown> = {};
  for (const key of nextKeys) {
    const shared = replaceEqualDeep(previous[key], next[key]);
    if (shared !== previous[key] || !(key in previous)) same = false;
    result[key] = shared;
  }
  return same ? previous : result;
}

/**
 * Structural sharing for JSON-shaped data (as TanStack Query does for fetched data): returns `next`
 * with every subtree that deep-equals the one in `previous` replaced by the previous object. A
 * snapshot that only moved the turn keeps the identity of every player, hand, card and trick, so
 * memoized components and selectors skip them; an identical snapshot returns `previous` itself.
 */
export function replaceEqualDeep<T>(previous: unknown, next: T): T {
  if (previous === next) return next;
  if (Array.isArray(previous) && Array.isArray(next)) return shareArray(previous, next) as T;
  if (isPlainObject(previous) && isPlainObject(next)) return shareObject(previous, next) as T;
  return next;
}
