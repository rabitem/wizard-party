import { describe, expect, it, vi } from 'vitest';
import { FRAME_SCHEDULING } from '@/presentation/config/render-quality.config';
import { ambientIntervalMs, RenderScheduler } from './render-scheduler';

describe('RenderScheduler', () => {
  it('should wake the renderer when a pulse starts and stay active for its duration', () => {
    const scheduler = new RenderScheduler();
    const wake = vi.fn();
    scheduler.bind(wake);

    scheduler.pulse(500, 1000);
    scheduler.pulse(200, 1100);

    expect(wake).toHaveBeenCalledTimes(1);
    expect(scheduler.isActive(1400)).toBe(true);
    expect(scheduler.isActive(1501)).toBe(false);
  });

  it('should stay active while a hold is held and release it only once', () => {
    const scheduler = new RenderScheduler();
    const release = scheduler.hold();
    expect(scheduler.isActive(0)).toBe(true);
    release();
    release();
    expect(scheduler.isActive(0)).toBe(false);
  });

  it('should poll probes such as awake physics bodies', () => {
    const scheduler = new RenderScheduler();
    let awake = true;
    const remove = scheduler.addProbe(() => awake);
    expect(scheduler.isActive(0)).toBe(true);
    awake = false;
    expect(scheduler.isActive(0)).toBe(false);
    awake = true;
    remove();
    expect(scheduler.isActive(0)).toBe(false);
  });

  it('should continue at full rate only while the scene moves or something is active', () => {
    const scheduler = new RenderScheduler();
    expect(scheduler.endFrame(0, true)).toBe(true);
    expect(scheduler.endFrame(16, false)).toBe(false);
  });

  it('should render shadows on request, on active frames and once more after motion stops', () => {
    const scheduler = new RenderScheduler();
    expect(scheduler.beginFrame(0).updateShadows).toBe(true); // initial bake
    scheduler.endFrame(0, false);
    expect(scheduler.beginFrame(100).updateShadows).toBe(false);

    scheduler.endFrame(100, true);
    expect(scheduler.beginFrame(116).updateShadows).toBe(true); // casters at their final pose
    scheduler.endFrame(116, false);
    expect(scheduler.beginFrame(200).updateShadows).toBe(false);

    scheduler.requestShadowUpdate();
    expect(scheduler.beginFrame(300).updateShadows).toBe(true);
  });

  it('should report intervals between consecutive full-rate frames only', () => {
    const scheduler = new RenderScheduler();
    const listener = vi.fn();
    scheduler.onContinuousFrame(listener);

    scheduler.beginFrame(0);
    scheduler.endFrame(0, false);
    scheduler.beginFrame(33);
    scheduler.endFrame(33, true);
    scheduler.beginFrame(41);
    scheduler.resetTiming();
    scheduler.beginFrame(500);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(8, 41);
  });
});

describe('ambientIntervalMs', () => {
  it('should render idle tables at the tier ambient rate', () => {
    expect(ambientIntervalMs(30, false)).toBeCloseTo(1000 / 30);
  });

  it('should lower the rate for reduced motion but never stop rendering', () => {
    expect(ambientIntervalMs(30, true)).toBeCloseTo(1000 / FRAME_SCHEDULING.REDUCED_MOTION_AMBIENT_FPS);
    expect(ambientIntervalMs(0, false)).toBeCloseTo(1000 / FRAME_SCHEDULING.MIN_AMBIENT_FPS);
  });
});
