import { describe, expect, it } from 'vitest';
import { NEON_REALISM } from '@/presentation/config/neon-environment.config';
import { neonStutterLevel } from './useNeonStutter';

describe('neonStutterLevel', () => {
  it('should stay fully lit outside the stutter window', () => {
    // cycle = time * SPEED (phase 0): the first (1 - SHARE) of every cycle is steady
    const steadyEnd = (1 - NEON_REALISM.STUTTER.SHARE) / NEON_REALISM.STUTTER.SPEED;
    for (let t = 0; t < steadyEnd; t += 0.05) expect(neonStutterLevel(t, 0)).toBe(1);
  });

  it('should only ever be lit or dropped to the off level', () => {
    const levels = new Set<number>();
    for (let t = 0; t < 60; t += 0.01) levels.add(neonStutterLevel(t, 1.3));
    expect([...levels].sort()).toEqual([NEON_REALISM.STUTTER.OFF_LEVEL, 1]);
  });
});
