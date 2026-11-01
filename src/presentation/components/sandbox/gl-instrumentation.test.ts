import { describe, expect, it } from 'vitest';
import type * as THREE from 'three';
import { GlInstrumentation } from './gl-instrumentation';

type ContextMethod = 'texImage2D' | 'texSubImage2D' | 'compressedTexImage2D' | 'linkProgram';

function fakeRenderer() {
  const calls: string[] = [];
  const record = (method: ContextMethod) => () => calls.push(method);
  const context: Record<ContextMethod, (...args: unknown[]) => unknown> = {
    texImage2D: record('texImage2D'),
    texSubImage2D: record('texSubImage2D'),
    compressedTexImage2D: record('compressedTexImage2D'),
    linkProgram: record('linkProgram'),
  };
  const info = { render: { calls: 0 } };
  const shadowMap = {
    render: () => {
      info.render.calls += 7;
    },
  };
  const renderer = { getContext: () => context, info, shadowMap } as unknown as THREE.WebGLRenderer;
  return { renderer, context, info, shadowMap, calls };
}

/** Upload sizes assume RGBA8: 4 bytes per texel, or the byte length of compressed data. */
const BYTES_PER_TEXEL = 4;

interface UploadRow {
  upload: string;
  method: Exclude<ContextMethod, 'linkProgram'>;
  args: unknown[];
  bytes: number;
}

const UPLOADS: UploadRow[] = [
  { upload: 'a texImage2D of given dimensions', method: 'texImage2D', args: [0, 0, 0, 256, 128, 0, 0, 0, null], bytes: 256 * 128 * BYTES_PER_TEXEL },
  { upload: 'a texSubImage2D of given dimensions', method: 'texSubImage2D', args: [0, 0, 0, 0, 64, 32, 0, 0, null], bytes: 64 * 32 * BYTES_PER_TEXEL },
  { upload: 'a texImage2D from an image source', method: 'texImage2D', args: [0, 0, 0, 0, 0, { naturalWidth: 512, naturalHeight: 256 }], bytes: 512 * 256 * BYTES_PER_TEXEL },
  { upload: 'a compressed upload', method: 'compressedTexImage2D', args: [0, 0, 0, 4, 4, 0, new Uint8Array(32)], bytes: 32 },
  { upload: 'a texImage2D from an unknown source', method: 'texImage2D', args: [0, 0, 0, 0, 0, null], bytes: 0 },
];

describe('GlInstrumentation', () => {
  it('should count uploads, links and shadow-pass draws per frame and pass every call through', () => {
    const { renderer, context, shadowMap, calls } = fakeRenderer();
    const instrumentation = new GlInstrumentation(renderer);

    context.texImage2D(0, 0, 0, 16, 16, 0, 0, 0, null);
    context.linkProgram();
    (shadowMap.render as () => void)();

    expect(instrumentation.takeFrame()).toEqual({ shadowDrawCalls: 7, textureUploads: 1, uploadBytes: 16 * 16 * BYTES_PER_TEXEL, programLinks: 1 });
    expect(instrumentation.takeFrame()).toEqual({ shadowDrawCalls: 0, textureUploads: 0, uploadBytes: 0, programLinks: 0 });
    expect(calls).toEqual(['texImage2D', 'linkProgram']);
  });

  it.each(UPLOADS)('should count $upload as one upload of $bytes bytes', ({ method, args, bytes }) => {
    const { renderer, context, calls } = fakeRenderer();
    const instrumentation = new GlInstrumentation(renderer);

    context[method](...args);

    expect(instrumentation.takeFrame()).toMatchObject({ textureUploads: 1, uploadBytes: bytes });
    expect(calls).toEqual([method]);
  });

  it('should restore the original methods on dispose', () => {
    const { renderer, context, shadowMap } = fakeRenderer();
    const originalLink = context.linkProgram;
    const originalShadow = shadowMap.render;
    const instrumentation = new GlInstrumentation(renderer);
    expect(context.linkProgram).not.toBe(originalLink);
    instrumentation.dispose();
    expect(context.linkProgram).toBe(originalLink);
    expect(shadowMap.render).toBe(originalShadow);
  });
});
