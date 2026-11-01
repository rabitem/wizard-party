import { describe, expect, it } from 'vitest';
import { GroundShadow } from './GroundShadow';

describe('GroundShadow', () => {
  it('is memoized so table re-renders do not re-bake the contact shadow', () => {
    expect((GroundShadow as unknown as { $$typeof: symbol }).$$typeof).toBe(Symbol.for('react.memo'));
  });
});
