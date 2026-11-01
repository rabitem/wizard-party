import type { ReactElement } from 'react';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SoftPointsMaterial } from './SoftPointsMaterial';

type MaterialElement = ReactElement<{ map?: unknown; transparent?: boolean; depthWrite?: boolean }>;

describe('SoftPointsMaterial', () => {
  it('draws points as a soft textured sprite instead of hard squares', () => {
    const element = SoftPointsMaterial({ size: 0.05 }) as MaterialElement;
    expect(element.type).toBe('pointsMaterial');
    expect(element.props.map).toBeInstanceOf(THREE.Texture);
    expect(element.props.transparent).toBe(true);
    expect(element.props.depthWrite).toBe(false);
  });
});
