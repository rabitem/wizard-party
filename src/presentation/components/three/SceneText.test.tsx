import { Suspense, isValidElement, type ReactElement } from 'react';
import { Text } from '@react-three/drei';
import { describe, expect, it } from 'vitest';
import { SceneText, SceneTextFontWarmup } from './SceneText';

type BoundaryElement = ReactElement<{ fallback: unknown; children: ReactElement<{ children?: unknown; visible?: boolean }> }>;

describe('SceneText', () => {
  it('wraps drei Text in its own Suspense boundary so a pending font cannot suspend the scene', () => {
    const element = SceneText({ children: 'YOU', fontSize: 0.05 }) as BoundaryElement;
    expect(element.type).toBe(Suspense);
    expect(element.props.fallback).toBeNull();
    expect(isValidElement(element.props.children)).toBe(true);
    expect(element.props.children.type).toBe(Text);
    expect(element.props.children.props.children).toBe('YOU');
  });
});

describe('SceneTextFontWarmup', () => {
  it('mounts a hidden SceneText that shares the default font preload', () => {
    const element = SceneTextFontWarmup() as ReactElement<{ visible?: boolean; font?: unknown; characters?: unknown }>;
    expect(element.type).toBe(SceneText);
    expect(element.props.visible).toBe(false);
    // A font or characters prop would give it a different suspend key than the game's text.
    expect(element.props.font).toBeUndefined();
    expect(element.props.characters).toBeUndefined();
  });
});
