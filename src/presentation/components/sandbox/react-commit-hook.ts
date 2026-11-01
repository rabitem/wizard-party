import type { ReactCommitTotals } from './sandbox-report.types';

/** Where the hook publishes its counters (window.__wizardReactCommits). */
export const REACT_COMMIT_STATS_KEY = '__wizardReactCommits';

export interface ReactCommitStats {
  /** Renderer id -> package name ('react-dom', '@react-three/fiber'). */
  renderers: Record<number, string>;
  commits: Record<number, number>;
  renders: Record<number, number>;
  maxRendersPerCommit: Record<number, number>;
  /** False in perf mode: commits are counted, the fiber tree is not walked. */
  countRenders: boolean;
}

/**
 * Installs (or wraps) the React DevTools global hook and counts commits per renderer and the
 * components that rendered in each commit. Production builds still call
 * hook.onCommitFiberRoot, unlike <Profiler>, whose callbacks only fire in development and
 * profiling builds. A renderer is only seen if it loads after the hook: the Playwright fixture
 * installs it as an init script (both react-dom and R3F); inside the page it is installed before
 * the sandbox imports R3F (R3F only).
 *
 * Self-contained on purpose: Playwright serialises this function into the page, so it may not
 * reference anything outside its own body.
 */
export function installReactCommitHook(target?: unknown): void {
  const scope = (target ?? globalThis) as Record<string, unknown> & { location?: { search?: string } };
  const statsKey = '__wizardReactCommits';
  if (scope[statsKey]) return;

  // Component fiber tags: function, class, forwardRef, memo, simple memo.
  const componentTags = new Set([0, 1, 11, 14, 15]);
  type Fiber = { tag: number; child: Fiber | null; sibling: Fiber | null; alternate: Fiber | null; memoizedProps: unknown; memoizedState: unknown };
  type Hook = Record<string, unknown> & {
    inject?: (renderer: { rendererPackageName?: string }) => number;
    onCommitFiberRoot?: (id: number, root: { current: Fiber }, ...rest: unknown[]) => void;
  };

  const stats: ReactCommitStats = {
    renderers: {},
    commits: {},
    renders: {},
    maxRendersPerCommit: {},
    countRenders: !/[?&]perf=(1|true)\b/.test(scope.location?.search ?? ''),
  };
  scope[statsKey] = stats;

  // Last props/state seen per fiber pair: a bailed-out subtree keeps its objects and does not count.
  const seen = new WeakMap<object, { props: unknown; state: unknown }>();
  const countRendered = (root: Fiber): number => {
    let rendered = 0;
    const stack: Fiber[] = [root];
    while (stack.length > 0) {
      const fiber = stack.pop() as Fiber;
      if (componentTags.has(fiber.tag)) {
        const record = seen.get(fiber) ?? (fiber.alternate ? seen.get(fiber.alternate) : undefined);
        if (!record || record.props !== fiber.memoizedProps || record.state !== fiber.memoizedState) rendered++;
        const next = { props: fiber.memoizedProps, state: fiber.memoizedState };
        seen.set(fiber, next);
        if (fiber.alternate) seen.set(fiber.alternate, next);
      }
      if (fiber.sibling) stack.push(fiber.sibling);
      if (fiber.child) stack.push(fiber.child);
    }
    return rendered;
  };

  const existing = scope.__REACT_DEVTOOLS_GLOBAL_HOOK__ as Hook | undefined;
  let nextId = 1;
  const hook: Hook = existing ?? {
    supportsFiber: true,
    isDisabled: false,
    renderers: new Map(),
    inject: () => nextId++,
    checkDCE() {},
    onScheduleFiberRoot() {},
    onCommitFiberUnmount() {},
    onPostCommitFiberRoot() {},
    onCommitFiberRoot() {},
    setStrictMode() {},
  };

  const originalInject = hook.inject?.bind(hook);
  hook.inject = (renderer) => {
    const id = originalInject ? originalInject(renderer) : nextId++;
    stats.renderers[id] = renderer.rendererPackageName ?? `renderer-${id}`;
    return id;
  };
  const originalCommit = hook.onCommitFiberRoot?.bind(hook);
  hook.onCommitFiberRoot = (id, root, ...rest) => {
    try {
      stats.commits[id] = (stats.commits[id] ?? 0) + 1;
      if (stats.countRenders && root?.current) {
        const rendered = countRendered(root.current);
        stats.renders[id] = (stats.renders[id] ?? 0) + rendered;
        stats.maxRendersPerCommit[id] = Math.max(stats.maxRendersPerCommit[id] ?? 0, rendered);
      }
    } finally {
      originalCommit?.(id, root, ...rest);
    }
  };
  if (!existing) scope.__REACT_DEVTOOLS_GLOBAL_HOOK__ = hook;
}

const R3F_PACKAGE = '@react-three/fiber';
const DOM_PACKAGE = 'react-dom';

function readStats(): ReactCommitStats | null {
  if (typeof window === 'undefined') return null;
  return ((window as unknown as Record<string, unknown>)[REACT_COMMIT_STATS_KEY] as ReactCommitStats | undefined) ?? null;
}

/** Combines one counter over every renderer of a package (null when the hook never saw that package). */
function combineFor(
  stats: ReactCommitStats,
  packageName: string,
  counts: Record<number, number>,
  combine: (a: number, b: number) => number
): number | null {
  const ids = Object.entries(stats.renderers).filter(([, name]) => name === packageName).map(([id]) => Number(id));
  if (ids.length === 0) return null;
  return ids.reduce((total, id) => combine(total, counts[id] ?? 0), 0);
}

const sum = (a: number, b: number) => a + b;

/** Cumulative counters since the hook was installed (null for renderers it never saw). */
export function readReactCommitTotals(stats: ReactCommitStats | null = readStats()): ReactCommitTotals {
  if (!stats) return { domCommits: null, r3fCommits: null, r3fRenders: null, r3fRendersPerCommitMax: null };
  const countsRenders = stats.countRenders;
  return {
    domCommits: combineFor(stats, DOM_PACKAGE, stats.commits, sum),
    r3fCommits: combineFor(stats, R3F_PACKAGE, stats.commits, sum),
    r3fRenders: countsRenders ? combineFor(stats, R3F_PACKAGE, stats.renders, sum) : null,
    r3fRendersPerCommitMax: countsRenders ? combineFor(stats, R3F_PACKAGE, stats.maxRendersPerCommit, Math.max) : null,
  };
}

/** Restarts the per-commit maximum (cumulative counts keep running; windows take differences). */
export function resetReactCommitMaxima(stats: ReactCommitStats | null = readStats()): void {
  if (stats) stats.maxRendersPerCommit = {};
}
