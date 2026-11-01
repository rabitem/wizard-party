/**
 * Test helper: a fake 2D canvas context that records every call and every
 * state assignment, so drawing code can be compared op-by-op.
 */
import { createHash } from 'node:crypto';

export interface RecordedOp {
  name: string;
  args: unknown[];
}

export interface RecordingContext {
  ctx: CanvasRenderingContext2D;
  ops: RecordedOp[];
}

const GRADIENT_FACTORIES = new Set(['createLinearGradient', 'createRadialGradient']);

export function createRecordingContext(): RecordingContext {
  const ops: RecordedOp[] = [];
  const state: Record<string | symbol, unknown> = {};
  let gradientCount = 0;

  const ctx = new Proxy(state, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop !== 'string') return undefined;
      return (...args: unknown[]) => {
        ops.push({ name: prop, args });
        if (!GRADIENT_FACTORIES.has(prop)) return undefined;
        const id = gradientCount++;
        return {
          __gradient: id,
          addColorStop: (...stop: unknown[]) => ops.push({ name: `gradient${id}.addColorStop`, args: stop }),
        };
      };
    },
    set(target, prop, value) {
      target[prop] = value;
      ops.push({ name: `set:${String(prop)}`, args: [value] });
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;

  return { ctx, ops };
}

export function hashOps(ops: RecordedOp[]): string {
  return createHash('sha256').update(JSON.stringify(ops)).digest('hex');
}

export function opNames(ops: RecordedOp[]): Set<string> {
  return new Set(ops.map((op) => op.name));
}
