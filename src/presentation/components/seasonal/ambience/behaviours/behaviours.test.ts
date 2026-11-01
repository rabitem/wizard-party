import { describe, expect, it } from 'vitest';
import { AMBIENCE_PACKS } from '@/presentation/config/seasonal-ambience-packs.config';
import type { AmbientLayerConfig, AmbientPack } from '@/presentation/config/seasonal-ambience.config';
import { layerRuntime } from '../layer-runtime';
import { createParticle, createRandom, type Particle } from '../particle';
import type { LayerRuntime, StepEnv } from '../types';
import { createWind } from '../wind';
import { BEHAVIOURS } from './index';
import { MARGIN } from './shared';

const VIEW = { width: 1200, height: 800 };
const DT = 1 / 60;

function pack(theme: keyof typeof AMBIENCE_PACKS): AmbientPack {
  const found = AMBIENCE_PACKS[theme];
  if (!found) throw new Error(`no pack for ${theme}`);
  return found;
}

function layerOf(theme: keyof typeof AMBIENCE_PACKS, behaviour: AmbientLayerConfig['behaviour']): LayerRuntime {
  const config = pack(theme).layers.find((l) => l.behaviour === behaviour);
  if (!config) throw new Error(`no ${behaviour} layer in ${theme}`);
  return layerRuntime(config);
}

function makeEnv(seed = 7): StepEnv {
  const rng = createRandom(seed);
  return { view: { ...VIEW }, time: 0, dt: DT, wind: createWind(pack('winter').wind, rng), rng };
}

function spawn(layer: LayerRuntime, initial = true, seed = 3): Particle {
  const p = createParticle();
  BEHAVIOURS[layer.config.behaviour].spawn(p, layer, createRandom(seed), VIEW, initial);
  return p;
}

function run(p: Particle, layer: LayerRuntime, env: StepEnv, seconds: number): void {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) {
    env.time += DT;
    BEHAVIOURS[layer.config.behaviour].step(p, layer, env);
  }
}

describe('ambient behaviours', () => {
  describe('spawn', () => {
    it('should be deterministic for the same seed', () => {
      const layer = layerOf('winter', 'fall');
      expect(spawn(layer, true, 11)).toEqual(spawn(layer, true, 11));
      expect(spawn(layer, true, 11)).not.toEqual(spawn(layer, true, 12));
    });

    it('should roll every particle inside its configured ranges', () => {
      for (const theme of Object.keys(AMBIENCE_PACKS) as (keyof typeof AMBIENCE_PACKS)[]) {
        for (const config of pack(theme).layers) {
          const layer = layerRuntime(config);
          for (let seed = 0; seed < 20; seed++) {
            const p = spawn(layer, true, seed);
            expect(p.size).toBeGreaterThanOrEqual(config.size[0]);
            expect(p.size).toBeLessThanOrEqual(config.size[1]);
            expect(p.alpha).toBeGreaterThanOrEqual(config.opacity[0]);
            expect(p.alpha).toBeLessThanOrEqual(config.opacity[1]);
            expect(p.base).toBeGreaterThanOrEqual(0);
            expect(p.base).toBeLessThan(layer.variants);
          }
        }
      }
    });

    it('should enter falling particles above the viewport when not initial', () => {
      const p = spawn(layerOf('winter', 'fall'), false);
      expect(p.y).toBeLessThan(0);
    });
  });

  describe('step', () => {
    it('should make snow fall and respawn at the top after leaving the bottom', () => {
      const layer = layerOf('winter', 'fall');
      const env = makeEnv();
      const p = spawn(layer);
      p.y = VIEW.height + MARGIN - 0.01;
      const before = p.y;
      BEHAVIOURS.fall.step(p, layer, env);
      expect(p.y < before).toBe(true);
      expect(p.y).toBeLessThan(0);
    });

    it('should keep snow inside the horizontal wrap band under strong wind', () => {
      const layer = layerOf('winter', 'fall');
      const env = makeEnv();
      env.wind.value = 400;
      const p = spawn(layer);
      run(p, layer, env, 10);
      expect(p.x).toBeGreaterThanOrEqual(-MARGIN);
      expect(p.x).toBeLessThanOrEqual(VIEW.width + MARGIN);
    });

    it('should drift falling particles with the wind', () => {
      const layer = layerOf('winter', 'fall');
      const calm = makeEnv();
      const windy = makeEnv();
      calm.wind.value = 0;
      windy.wind.value = 60;
      const a = spawn(layer);
      const b = spawn(layer);
      BEHAVIOURS.fall.step(a, layer, calm);
      BEHAVIOURS.fall.step(b, layer, windy);
      expect(b.x - a.x).toBeCloseTo(60 * layer.config.windFactor * DT, 5);
    });

    it('should tumble leaves through a mirrored scaleX without ever vanishing', () => {
      const layer = layerOf('autumn', 'flutter');
      const env = makeEnv();
      const p = spawn(layer);
      const scales: number[] = [];
      for (let i = 0; i < 600; i++) {
        env.time += DT;
        BEHAVIOURS.flutter.step(p, layer, env);
        scales.push(p.scaleX);
      }
      expect(Math.min(...scales)).toBeLessThan(0);
      expect(Math.max(...scales)).toBeGreaterThan(0);
      expect(Math.min(...scales.map(Math.abs))).toBeGreaterThanOrEqual(0.08);
    });

    it('should lift drifting embers upwards and wrap them to the bottom', () => {
      const layer = layerOf('halloween', 'drift');
      const env = makeEnv();
      const p = spawn(layer);
      p.y = 400;
      run(p, layer, env, 1);
      expect(p.y).toBeLessThan(400);
      p.y = -MARGIN - 1;
      BEHAVIOURS.drift.step(p, layer, env);
      expect(p.y).toBeGreaterThan(VIEW.height - MARGIN);
    });

    it('should keep bats hidden while waiting and show them once they fly', () => {
      const layer = layerOf('halloween', 'bat');
      const env = makeEnv();
      const p = spawn(layer, false);
      expect(p.wait).toBeGreaterThan(0);
      BEHAVIOURS.bat.step(p, layer, env);
      expect(p.drawAlpha).toBe(0);
      p.wait = 0;
      BEHAVIOURS.bat.step(p, layer, env);
      expect(p.drawAlpha).toBeGreaterThan(0);
      expect(p.sprite).toBeGreaterThanOrEqual(p.base * layer.frames);
      expect(p.sprite).toBeLessThan((p.base + 1) * layer.frames);
    });

    it('should cycle bat flap frames over time', () => {
      const layer = layerOf('halloween', 'bat');
      const env = makeEnv();
      const p = spawn(layer, false);
      p.wait = 0;
      const frames = new Set<number>();
      for (let i = 0; i < 60; i++) {
        env.time += DT;
        BEHAVIOURS.bat.step(p, layer, env);
        frames.add(p.sprite);
      }
      expect(frames.size).toBeGreaterThan(2);
    });

    it('should fire a shooting star that fades out and schedules the next one', () => {
      const layer = layerOf('celestial', 'shooting');
      const env = makeEnv();
      const p = spawn(layer, false);
      p.wait = 0;
      let peak = 0;
      for (let i = 0; i < 200 && p.wait <= 0; i++) {
        BEHAVIOURS.shooting.step(p, layer, env);
        peak = Math.max(peak, p.drawAlpha);
      }
      expect(peak).toBeGreaterThan(0.3);
      expect(p.wait).toBeGreaterThan(0);
      expect(p.drawAlpha).toBe(0);
    });

    it('should re-fit twinkling stars to a resized viewport', () => {
      const layer = layerOf('celestial', 'twinkle');
      const env = makeEnv();
      const p = spawn(layer);
      BEHAVIOURS.twinkle.step(p, layer, env);
      const fx = p.x / VIEW.width;
      env.view.width = 600;
      BEHAVIOURS.twinkle.step(p, layer, env);
      expect(p.x / 600).toBeCloseTo(fx, 6);
    });

    it('should blink pixel stars in hard steps', () => {
      const layer = layerOf('pixel', 'twinkle');
      const env = makeEnv();
      const p = spawn(layer);
      const levels = new Set<number>();
      for (let i = 0; i < 400; i++) {
        env.time += DT;
        BEHAVIOURS.twinkle.step(p, layer, env);
        levels.add(Number(p.drawAlpha.toFixed(6)));
      }
      expect(levels.size).toBeLessThanOrEqual(4);
    });

    it('should bend rain streaks along the wind', () => {
      const layer = layerOf('neon', 'rain');
      const env = makeEnv();
      env.wind.value = -200;
      const p = spawn(layer);
      BEHAVIOURS.rain.step(p, layer, env);
      expect(p.angle).toBeGreaterThan(Math.PI / 2);
    });

    it('should fade ink glints in and out over their lifetime', () => {
      const layer = layerOf('manga', 'glint');
      const env = makeEnv();
      const p = spawn(layer, false);
      const ttl = p.ttl;
      run(p, layer, env, ttl / 2);
      expect(p.drawAlpha).toBeGreaterThan(p.alpha * 0.8);
    });
  });
});
