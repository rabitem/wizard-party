import type * as THREE from 'three';

const BYTES_PER_TEXEL = 4;

type TexImageSource = { width?: number; height?: number; naturalWidth?: number; videoWidth?: number; videoHeight?: number; naturalHeight?: number };

function sourceSize(source: unknown): number {
  if (!source || typeof source !== 'object') return 0;
  const image = source as TexImageSource;
  const width = image.naturalWidth || image.videoWidth || image.width || 0;
  const height = image.naturalHeight || image.videoHeight || image.height || 0;
  return width * height * BYTES_PER_TEXEL;
}

function texelBytes(width: unknown, height: unknown, depth: unknown = 1): number {
  const size = Number(width) * Number(height) * Number(depth) * BYTES_PER_TEXEL;
  return Number.isFinite(size) && size > 0 ? size : 0;
}

/**
 * Estimated bytes of one texture upload call (RGBA8 assumed; good enough to compare runs).
 * Handles the dimension overloads and the TexImageSource overloads of texImage2D/texSubImage2D.
 */
function estimateUploadBytes(method: UploadMethod, args: readonly unknown[]): number {
  switch (method) {
    case 'texImage2D':
      // (target, level, internalformat, width, height, border, format, type, pixels) or (..., format, type, source)
      return args.length >= 8 ? texelBytes(args[3], args[4]) : sourceSize(args[5]);
    case 'texSubImage2D':
      // (target, level, x, y, width, height, format, type, pixels) or (target, level, x, y, format, type, source)
      return args.length >= 8 ? texelBytes(args[4], args[5]) : sourceSize(args[6]);
    case 'texImage3D':
      return texelBytes(args[3], args[4], args[5]);
    case 'texSubImage3D':
      return texelBytes(args[5], args[6], args[7]);
    case 'compressedTexImage2D':
    case 'compressedTexSubImage2D': {
      const data = args.find((arg): arg is ArrayBufferView => ArrayBuffer.isView(arg));
      return data?.byteLength ?? 0;
    }
  }
}

/** WebGL's FLOAT type: in this scene only skinned meshes upload float data (their bone matrices). */
const GL_FLOAT = 0x1406;

/** Bone matrices of a skinned mesh: texImage2D and texSubImage2D both take the type as their 8th argument. */
function isBoneUpload(method: UploadMethod, args: readonly unknown[]): boolean {
  return (method === 'texImage2D' || method === 'texSubImage2D') && args.length >= 9 && args[7] === GL_FLOAT;
}

const UPLOAD_METHODS = ['texImage2D', 'texSubImage2D', 'texImage3D', 'texSubImage3D', 'compressedTexImage2D', 'compressedTexSubImage2D'] as const;
type UploadMethod = typeof UPLOAD_METHODS[number];

export interface GlFrameCounts {
  shadowDrawCalls: number;
  textureUploads: number;
  /** Float uploads of skinned meshes' bone matrices (a few KB each), kept apart from textureUploads. */
  boneUploads: number;
  uploadBytes: number;
  programLinks: number;
}

type AnyFunction = (...args: unknown[]) => unknown;

/**
 * Counts what renderer.info does not: draw calls issued by shadow-map passes, texture uploads
 * (count and estimated bytes) and shader program links. Wraps a handful of rarely called context
 * methods plus the shadow map's render entry, so the cost per frame is a few property reads.
 * Requires renderer.info.autoReset = false (the probe resets the counters once per frame).
 */
export class GlInstrumentation {
  private counts: GlFrameCounts = { shadowDrawCalls: 0, textureUploads: 0, boneUploads: 0, uploadBytes: 0, programLinks: 0 };
  private readonly restores: Array<() => void> = [];

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    const context = renderer.getContext() as unknown as Record<string, AnyFunction>;
    for (const method of UPLOAD_METHODS) {
      this.wrap(context, method, (args) => {
        if (isBoneUpload(method, args)) {
          this.counts.boneUploads++;
          return;
        }
        this.counts.textureUploads++;
        this.counts.uploadBytes += estimateUploadBytes(method, args);
      });
    }
    this.wrap(context, 'linkProgram', () => {
      this.counts.programLinks++;
    });
    this.wrapShadowMap();
  }

  /** Counts since the previous call. */
  takeFrame(): GlFrameCounts {
    const counts = this.counts;
    this.counts = { shadowDrawCalls: 0, textureUploads: 0, boneUploads: 0, uploadBytes: 0, programLinks: 0 };
    return counts;
  }

  dispose(): void {
    for (const restore of this.restores.splice(0)) restore();
  }

  private wrap(target: Record<string, AnyFunction>, method: string, before: (args: unknown[]) => void): void {
    const original = target[method];
    if (typeof original !== 'function') return;
    const hadOwn = Object.prototype.hasOwnProperty.call(target, method);
    target[method] = function wrapped(this: unknown, ...args: unknown[]) {
      before(args);
      return original.apply(this, args);
    };
    this.restores.push(() => {
      if (hadOwn) target[method] = original;
      else delete target[method];
    });
  }

  private wrapShadowMap(): void {
    const { shadowMap, info } = this.renderer;
    const original = shadowMap.render;
    shadowMap.render = (...args: Parameters<THREE.WebGLShadowMap['render']>) => {
      const before = info.render.calls;
      original.apply(shadowMap, args);
      this.counts.shadowDrawCalls += info.render.calls - before;
    };
    this.restores.push(() => {
      shadowMap.render = original;
    });
  }
}
