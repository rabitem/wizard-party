import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { getTableTheme } from './table-theme';
import {
  createLeatherMaterialProps,
  createTableContactShadowProps,
  createWoodMaterialProps,
} from './table-visual-materials';

describe('table visual materials', () => {
  it('wires the generated wood texture and normal map', () => {
    const woodTexture = new THREE.Texture();
    const normalMap = new THREE.Texture();
    const theme = getTableTheme('forest');

    const materialProps = createWoodMaterialProps(theme, {
      woodTexture,
      woodNormalMap: normalMap,
    });

    expect(materialProps.map).toBe(woodTexture);
    expect(materialProps.normalMap).toBe(normalMap);
  });

  it('wires the generated leather texture and normal map', () => {
    const leatherTexture = new THREE.Texture();
    const normalMap = new THREE.Texture();
    const theme = getTableTheme('default');

    const materialProps = createLeatherMaterialProps(theme, {
      leatherTexture,
      leatherNormalMap: normalMap,
    });

    expect(materialProps.map).toBe(leatherTexture);
    expect(materialProps.normalMap).toBe(normalMap);
  });

  it('omits the normal map when none was generated', () => {
    const woodTexture = new THREE.Texture();
    const theme = getTableTheme('default');

    const materialProps = createWoodMaterialProps(theme, {
      woodTexture,
      woodNormalMap: null,
    });

    expect(materialProps.map).toBe(woodTexture);
    expect(materialProps.normalMap).toBeUndefined();
  });

  it('bakes the contact shadow a single time', () => {
    expect(createTableContactShadowProps().frames).toBe(1);
  });
});
