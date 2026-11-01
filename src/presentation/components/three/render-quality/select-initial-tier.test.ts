import { describe, expect, it } from 'vitest';
import { classifyGpu, selectInitialTier, type RenderDeviceSignals } from './select-initial-tier';

const desktop: RenderDeviceSignals = {
  renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  majorPerformanceCaveat: false,
  cores: 16,
  memoryGb: 8,
  coarsePointer: false,
  devicePixelRatio: 1,
};

describe('classifyGpu', () => {
  it('should recognise software, discrete and integrated renderers', () => {
    expect(classifyGpu('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)')).toBe('software');
    expect(classifyGpu(desktop.renderer)).toBe('discrete');
    expect(classifyGpu('ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)')).toBe('discrete');
    expect(classifyGpu('ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)')).toBe('integrated');
    expect(classifyGpu('ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)')).toBe('integrated');
  });

  it('should treat masked renderer strings as unknown', () => {
    expect(classifyGpu(null)).toBe('unknown');
    expect(classifyGpu('Brave')).toBe('unknown');
  });
});

describe('selectInitialTier', () => {
  it('should start capable desktops on the top tier', () => {
    expect(selectInitialTier(desktop)).toBe('ultra');
  });

  it('should start one tier lower on very dense desktop screens', () => {
    expect(selectInitialTier({ ...desktop, devicePixelRatio: 2.5 })).toBe('high');
  });

  it('should start software rendering and blocklisted GPUs on the low tier', () => {
    expect(selectInitialTier({ ...desktop, renderer: 'Google SwiftShader' })).toBe('low');
    expect(selectInitialTier({ ...desktop, majorPerformanceCaveat: true })).toBe('low');
  });

  it('should start integrated GPUs and small machines on the medium tier', () => {
    expect(selectInitialTier({ ...desktop, renderer: 'Intel(R) Iris(R) Plus Graphics' })).toBe('medium');
    expect(selectInitialTier({ ...desktop, renderer: null, cores: 4 })).toBe('medium');
    expect(selectInitialTier({ ...desktop, renderer: null, memoryGb: 4 })).toBe('medium');
  });

  it('should start masked desktops on the high tier and let the governor correct it', () => {
    expect(selectInitialTier({ ...desktop, renderer: 'Brave' })).toBe('high');
  });

  it('should give capable phones a 2x tier and other touch devices the medium tier', () => {
    const phone = { ...desktop, renderer: 'Apple GPU', coarsePointer: true, devicePixelRatio: 3, memoryGb: 0, cores: 6 };
    expect(selectInitialTier(phone)).toBe('high');
    expect(selectInitialTier({ ...phone, renderer: 'Mali-G57', cores: 8, memoryGb: 4 })).toBe('medium');
  });
});
