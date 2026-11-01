import { Children, Suspense, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { FeltSurface } from './FeltSurface';
import { TableSurface } from './TableSurface';
import { WoodTableRim } from './WoodTableRim';

describe('TableSurface', () => {
  it('reveals the rim and felt from one Suspense boundary, so the shadow bake sees both', () => {
    const element = TableSurface({ players: [], localPlayerId: 'p1', currentPlayerIndex: 0 }) as ReactElement<{ fallback: ReactNode; children: ReactNode }>;
    expect(element.type).toBe(Suspense);
    expect(element.props.fallback).not.toBeNull();

    const childTypes = Children.toArray(element.props.children).map((child) => (child as ReactElement).type);
    expect(childTypes).toEqual([WoodTableRim, FeltSurface]);
  });
});
