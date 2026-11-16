import { Suspense, createElement, isValidElement, type ReactElement } from 'react';
import { Text } from '@react-three/drei';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SceneText, SceneTextFontWarmup } from './SceneText';

vi.mock('@react-three/drei', () => ({ Text: vi.fn(() => null) }));

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
    renderToStaticMarkup(createElement(SceneTextFontWarmup));
    const props = vi.mocked(Text).mock.calls.at(-1)?.[0];
    expect(props?.visible).toBe(false);
    // Font/characters would select a different suspend key from the game's ordinary labels.
    expect(props?.font).toBeUndefined();
    expect(props?.characters).toBeUndefined();
  });
});
