import { describe, expect, it } from 'vitest';
import { installReactCommitHook, readReactCommitTotals, resetReactCommitMaxima, type ReactCommitStats } from './react-commit-hook';

type Fiber = { tag: number; child: Fiber | null; sibling: Fiber | null; alternate: Fiber | null; memoizedProps: unknown; memoizedState: unknown };
type Hook = {
  inject(renderer: { rendererPackageName?: string }): number;
  onCommitFiberRoot(id: number, root: { current: Fiber }): void;
};

const FUNCTION_COMPONENT = 0;
const HOST_COMPONENT = 5;

function fiber(tag: number, props: unknown, children: Fiber[] = []): Fiber {
  const node: Fiber = { tag, child: null, sibling: null, alternate: null, memoizedProps: props, memoizedState: null };
  node.child = children[0] ?? null;
  children.forEach((child, index) => {
    child.sibling = children[index + 1] ?? null;
  });
  return node;
}

function install(search = '') {
  const scope: Record<string, unknown> = { location: { search } };
  installReactCommitHook(scope);
  const hook = scope.__REACT_DEVTOOLS_GLOBAL_HOOK__ as Hook;
  const stats = scope.__wizardReactCommits as ReactCommitStats;
  return { hook, stats };
}

describe('installReactCommitHook', () => {
  it('should count commits and rendered components per renderer', () => {
    const { hook, stats } = install();
    const dom = hook.inject({ rendererPackageName: 'react-dom' });
    const r3f = hook.inject({ rendererPackageName: '@react-three/fiber' });

    const tree = fiber(FUNCTION_COMPONENT, { a: 1 }, [fiber(FUNCTION_COMPONENT, { b: 1 }), fiber(HOST_COMPONENT, {})]);
    hook.onCommitFiberRoot(r3f, { current: tree });
    hook.onCommitFiberRoot(dom, { current: fiber(HOST_COMPONENT, {}) });

    expect(readReactCommitTotals(stats)).toEqual({ domCommits: 1, r3fCommits: 1, r3fRenders: 2, r3fRendersPerCommitMax: 2 });
  });

  it('should not count a component again when its props and state did not change (bailout)', () => {
    const { hook, stats } = install();
    const r3f = hook.inject({ rendererPackageName: '@react-three/fiber' });
    const props = { stable: true };
    const tree = fiber(FUNCTION_COMPONENT, props);
    hook.onCommitFiberRoot(r3f, { current: tree });
    hook.onCommitFiberRoot(r3f, { current: tree });
    expect(readReactCommitTotals(stats).r3fRenders).toBe(1);
    expect(readReactCommitTotals(stats).r3fCommits).toBe(2);
  });

  it('should only count commits in perf mode', () => {
    const { hook, stats } = install('?clock=real&perf=1');
    const r3f = hook.inject({ rendererPackageName: '@react-three/fiber' });
    hook.onCommitFiberRoot(r3f, { current: fiber(FUNCTION_COMPONENT, {}) });
    expect(readReactCommitTotals(stats)).toEqual({ domCommits: null, r3fCommits: 1, r3fRenders: null, r3fRendersPerCommitMax: null });
  });

  it('should wrap an existing DevTools hook and keep calling it', () => {
    const forwarded: number[] = [];
    const scope: Record<string, unknown> = {
      location: { search: '' },
      __REACT_DEVTOOLS_GLOBAL_HOOK__: {
        inject: () => 41,
        onCommitFiberRoot: (id: number) => forwarded.push(id),
      },
    };
    installReactCommitHook(scope);
    const hook = scope.__REACT_DEVTOOLS_GLOBAL_HOOK__ as Hook;
    expect(hook.inject({ rendererPackageName: 'react-dom' })).toBe(41);
    hook.onCommitFiberRoot(41, { current: fiber(HOST_COMPONENT, {}) });
    expect(forwarded).toEqual([41]);
  });

  it('should reset the per-commit maximum but keep the cumulative counts', () => {
    const { hook, stats } = install();
    const r3f = hook.inject({ rendererPackageName: '@react-three/fiber' });
    hook.onCommitFiberRoot(r3f, { current: fiber(FUNCTION_COMPONENT, { n: 1 }, [fiber(FUNCTION_COMPONENT, { n: 2 })]) });
    resetReactCommitMaxima(stats);
    expect(readReactCommitTotals(stats).r3fRendersPerCommitMax).toBe(0);
    expect(readReactCommitTotals(stats).r3fRenders).toBe(2);
  });

  it('should report nothing without the hook', () => {
    expect(readReactCommitTotals(null)).toEqual({ domCommits: null, r3fCommits: null, r3fRenders: null, r3fRendersPerCommitMax: null });
  });
});
