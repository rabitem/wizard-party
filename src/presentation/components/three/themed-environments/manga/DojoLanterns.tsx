'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { MANGA_COLORS, MANGA_LANTERN_LIGHT, MANGA_LANTERN_TINTS, MANGA_LANTERNS, MANGA_ROOM } from '@/presentation/config/manga-environment.config';
import {
  createGlowMaterial,
  GlowSprites,
  InstancedProp,
  localMatrix,
  useDisposables,
  useFlicker,
  type GlowPoint,
  type PropPlacement,
} from '../primitives';
import { createInkOutlineMaterial, createToonMaterial } from './manga-geometry';
import { createLanternTexture } from './manga-textures';

const LANTERN = { RADIUS: 0.38, STRETCH: 1.35, CAP_RADIUS: 0.2, CAP_HEIGHT: 0.09 } as const;
const HALF_HEIGHT = LANTERN.RADIUS * LANTERN.STRETCH;
const CORD_RADIUS = 0.012;
const OUTLINE = 1.07;
const GLOW = { SCALE: 1.9, OPACITY: 0.38, AMPLITUDE: 0.1 } as const;
const CEILING_Y = MANGA_ROOM.FLOOR_Y + MANGA_ROOM.HEIGHT;

interface LanternLayout {
  lanterns: PropPlacement[];
  cords: PropPlacement[];
  glows: GlowPoint[];
}

function buildLayout(): LanternLayout {
  const layout: LanternLayout = { lanterns: [], cords: [], glows: [] };
  MANGA_LANTERNS.forEach(([x, z, hang], i) => {
    const y = MANGA_ROOM.FLOOR_Y + hang;
    layout.lanterns.push({ position: [x, y, z], rotationY: i * 0.9, color: MANGA_LANTERN_TINTS[i % MANGA_LANTERN_TINTS.length] });
    const cordBottom = y + HALF_HEIGHT + LANTERN.CAP_HEIGHT;
    layout.cords.push({ position: [x, (cordBottom + CEILING_Y) / 2, z], scale: [1, CEILING_Y - cordBottom, 1] });
    layout.glows.push({ position: [x, y, z], scale: GLOW.SCALE });
  });
  return layout;
}

const CAP_TOP = localMatrix([0, HALF_HEIGHT, 0]);
const CAP_BOTTOM = localMatrix([0, -HALF_HEIGHT, 0]);
const PAPER_OUTLINE = localMatrix([0, 0, 0], [0, 0, 0], [OUTLINE, OUTLINE, OUTLINE]);

/** Chochin paper lanterns with ink ribs and a red brush mark, hung from the beams. */
export function DojoLanterns() {
  const layout = useMemo(() => buildLayout(), []);
  const assets = useMemo(() => {
    const paper = new THREE.SphereGeometry(LANTERN.RADIUS, 14, 10);
    paper.scale(1, LANTERN.STRETCH, 1);
    const skin = createLanternTexture();
    return {
      paper,
      skin,
      cap: new THREE.CylinderGeometry(LANTERN.CAP_RADIUS, LANTERN.CAP_RADIUS, LANTERN.CAP_HEIGHT, 10),
      cord: new THREE.CylinderGeometry(CORD_RADIUS, CORD_RADIUS, 1, 4),
      // Colour above 1 (linear) so the lit washi blooms softly.
      paperMaterial: new THREE.MeshBasicMaterial({ map: skin, color: new THREE.Color().setRGB(...MANGA_LANTERN_LIGHT.BRIGHTNESS), toneMapped: false }),
      capMaterial: createToonMaterial(MANGA_COLORS.lacquer),
      cordMaterial: new THREE.MeshBasicMaterial({ color: MANGA_COLORS.ink }),
      outline: createInkOutlineMaterial(),
      glow: createGlowMaterial(MANGA_COLORS.lanternGlow, GLOW.OPACITY),
    };
  }, []);
  useDisposables(assets);

  const flicker = useMemo(
    () => [{ material: assets.glow, base: GLOW.OPACITY, amplitude: GLOW.AMPLITUDE, phase: 0.7, useOpacity: true }],
    [assets],
  );
  useFlicker(flicker);

  return (
    <group>
      <InstancedProp geometry={assets.cord} material={assets.cordMaterial} placements={layout.cords} />
      <InstancedProp geometry={assets.paper} material={assets.paperMaterial} placements={layout.lanterns} />
      <InstancedProp geometry={assets.paper} material={assets.outline} placements={layout.lanterns} offset={PAPER_OUTLINE} />
      <InstancedProp geometry={assets.cap} material={assets.capMaterial} placements={layout.lanterns} offset={CAP_TOP} />
      <InstancedProp geometry={assets.cap} material={assets.capMaterial} placements={layout.lanterns} offset={CAP_BOTTOM} />
      <GlowSprites points={layout.glows} material={assets.glow} />
    </group>
  );
}
