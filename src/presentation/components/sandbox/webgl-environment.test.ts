import { describe, expect, it } from 'vitest';
import { isSoftwareRenderer, isWebGlFailure } from './webgl-environment';

describe('WebGL environment classification', () => {
  it('should recognise software rasterisers', () => {
    expect(isSoftwareRenderer('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)')).toBe(true);
    expect(isSoftwareRenderer('llvmpipe (LLVM 15.0.7, 256 bits)')).toBe(true);
    expect(isSoftwareRenderer('ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0)')).toBe(false);
    expect(isSoftwareRenderer(null)).toBe(false);
  });

  it('should tell renderer failures from game errors', () => {
    expect(isWebGlFailure("THREE.WebGLRenderer: null is not an object (evaluating 'e.getShaderPrecisionFormat(...)')")).toBe(true);
    expect(isWebGlFailure('Error creating WebGL context.')).toBe(true);
    expect(isWebGlFailure('Failed to play tone: Web Audio API is not supported')).toBe(false);
  });
});
