'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import {
  WINTER_COLORS,
  WINTER_GIFT_COLORS,
  WINTER_GIFTS,
  WINTER_LAYOUT,
  WINTER_ORNAMENT_COLORS,
  WINTER_RIBBON_COLORS,
} from '@/presentation/config/winter-environment.config';
import type { Vec3 } from '@/presentation/config/themed-environment.config';
import {
  addSurfaceDetail,
  createFlameMaterial,
  createGlowMaterial,
  GlowSprites,
  InstancedProp,
  localMatrix,
  seededRandom,
  useDisposables,
  useFlicker,
  type GlowPoint,
  type PropPlacement,
} from '../primitives';
import { applySnowDusting } from './snow-dusting';

const TIERS = 4;
const TIER_SEGMENTS = 9;
const TRUNK = { RADIUS: 0.22, HEIGHT: 0.7 } as const;
const ORNAMENT_RADIUS = 0.085;
const ORNAMENT_GLOW_SCALE = 0.45;
const STAR = { SIZE: 0.26, GLOW: 1.6 } as const;
const SKIRT_RADIUS_RATIO = 0.75;

/** Light snow settled on the upper side of the boughs (patchy, with glints). */
const BOUGH_SNOW = { amount: 0.5, threshold: 0.42, patchScale: 2.4, sparkle: 0.5 } as const;

function snowyPine(color: string): THREE.MeshStandardMaterial {
  const material = addSurfaceDetail(new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true }), { scale: 6, normalStrength: 0.8 });
  return applySnowDusting(material, { ...BOUGH_SNOW, color: WINTER_COLORS.snow });
}

const [TREE_X, TREE_Y, TREE_Z] = WINTER_LAYOUT.TREE_POSITION;
const { TREE_HEIGHT, TREE_RADIUS } = WINTER_LAYOUT;
const FOLIAGE_HEIGHT = TREE_HEIGHT - TRUNK.HEIGHT;
const TIER_HEIGHT = (FOLIAGE_HEIGHT / TIERS) * 1.45;

interface Tier {
  id: string;
  baseY: number;
  radius: number;
  height: number;
  material: 'pineDark' | 'pine' | 'pineLight';
}

function tierMaterial(index: number): Tier['material'] {
  if (index === 0) return 'pineDark';
  if (index === TIERS - 1) return 'pineLight';
  return 'pine';
}

/** Overlapping cones, widest at the bottom, each tier a shade lighter. */
const TIER_LIST: Tier[] = Array.from({ length: TIERS }, (_, i) => {
  const t = i / TIERS;
  return {
    id: `tier-${i}`,
    baseY: TRUNK.HEIGHT + (FOLIAGE_HEIGHT / TIERS) * i * 0.92,
    radius: TREE_RADIUS * (1 - t * 0.72),
    height: TIER_HEIGHT * (1 - t * 0.25),
    material: tierMaterial(i),
  };
});
const TOP_Y = TIER_LIST[TIERS - 1].baseY + TIER_LIST[TIERS - 1].height;

/** Ornaments scattered over the lower half of each tier's cone surface. */
const ORNAMENTS: PropPlacement[] = (() => {
  const rand = seededRandom(97);
  return Array.from({ length: WINTER_LAYOUT.ORNAMENT_COUNT }, (_, i) => {
    const tier = TIER_LIST[i % (TIERS - 1)];
    const along = 0.08 + rand() * 0.45;
    const radius = tier.radius * (1 - along) + ORNAMENT_RADIUS * 0.6;
    const angle = rand() * Math.PI * 2;
    return {
      position: [TREE_X + Math.cos(angle) * radius, TREE_Y + tier.baseY + along * tier.height, TREE_Z + Math.sin(angle) * radius] as Vec3,
      scale: 0.8 + rand() * 0.5,
      color: WINTER_ORNAMENT_COLORS[i % WINTER_ORNAMENT_COLORS.length],
    };
  });
})();
const ORNAMENT_GLOWS: GlowPoint[] = ORNAMENTS.filter((_, i) => i % WINTER_LAYOUT.ORNAMENT_GLOW_EVERY === 0).map((o) => ({
  position: o.position,
  scale: ORNAMENT_GLOW_SCALE,
}));
const STAR_POSITION: Vec3 = [TREE_X, TREE_Y + TOP_Y + STAR.SIZE * 0.6, TREE_Z];

const GIFTS: PropPlacement[] = WINTER_GIFTS.map(([x, z, w, h, d, rot], i) => ({
  position: [x, TREE_Y, z],
  scale: [w, h, d],
  rotationY: rot,
  color: WINTER_GIFT_COLORS[i % WINTER_GIFT_COLORS.length],
}));
const RIBBONS: PropPlacement[] = GIFTS.map((gift, i) => ({ ...gift, color: WINTER_RIBBON_COLORS[i % WINTER_RIBBON_COLORS.length] }));
/** Ribbon bands as thin slices of the (base-anchored) unit gift box. */
const RIBBON_X = localMatrix([0, 0, 0], [0, 0, 0], [1.02, 1.02, 0.16]);
const RIBBON_Z = localMatrix([0, 0, 0], [0, 0, 0], [0.16, 1.02, 1.02]);

/**
 * Decorated pine in the back corner: tiered boughs dusted with snow, glowing
 * ornaments with twinkling halos, a radiant star, a tree skirt and wrapped gifts.
 */
export function ChristmasTree() {
  const assets = useMemo(() => {
    const giftBox = new THREE.BoxGeometry(1, 1, 1);
    giftBox.translate(0, 0.5, 0);
    const star = new THREE.OctahedronGeometry(STAR.SIZE, 0);
    star.scale(1, 1.25, 0.45);
    return {
      giftBox,
      star,
      tierGeometry: new THREE.ConeGeometry(1, 1, TIER_SEGMENTS, 1),
      ornament: new THREE.SphereGeometry(ORNAMENT_RADIUS, 8, 6),
      pineDark: snowyPine(WINTER_COLORS.pineDark),
      pine: snowyPine(WINTER_COLORS.pine),
      pineLight: snowyPine(WINTER_COLORS.pineLight),
      trunk: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: WINTER_COLORS.trunk, roughness: 0.9 }), { scale: 3, normalStrength: 0.6 }),
      skirt: new THREE.MeshStandardMaterial({ color: WINTER_COLORS.treeSkirt, roughness: 1 }),
      bauble: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
      giftPaper: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }),
      ribbon: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, metalness: 0.2 }),
      starMaterial: createFlameMaterial(WINTER_COLORS.star, 1),
      starGlow: createGlowMaterial(WINTER_COLORS.starGlow, 0.75),
      ornamentGlow: createGlowMaterial(WINTER_COLORS.ornamentGlow, 0.45),
    };
  }, []);
  useDisposables(assets);

  const flickerTargets = useMemo(
    () => [
      { material: assets.starGlow, base: 0.75, amplitude: 0.15, phase: 0.4, useOpacity: true },
      { material: assets.ornamentGlow, base: 0.45, amplitude: 0.45, phase: 3.1, useOpacity: true },
    ],
    [assets],
  );
  useFlicker(flickerTargets);

  return (
    <group>
      <group position={WINTER_LAYOUT.TREE_POSITION}>
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={assets.skirt}>
          <circleGeometry args={[TREE_RADIUS * SKIRT_RADIUS_RATIO, 16]} />
        </mesh>
        <mesh position={[0, TRUNK.HEIGHT / 2, 0]} material={assets.trunk}>
          <cylinderGeometry args={[TRUNK.RADIUS * 0.8, TRUNK.RADIUS, TRUNK.HEIGHT, 7]} />
        </mesh>
        {TIER_LIST.map((tier, i) => (
          <mesh
            key={tier.id}
            position={[0, tier.baseY + tier.height / 2, 0]}
            scale={[tier.radius, tier.height, tier.radius]}
            rotation={[0, i * 0.4, 0]}
            geometry={assets.tierGeometry}
            material={assets[tier.material]}
          />
        ))}
      </group>
      <InstancedProp geometry={assets.ornament} material={assets.bauble} placements={ORNAMENTS} />
      <GlowSprites points={ORNAMENT_GLOWS} material={assets.ornamentGlow} />
      <mesh position={STAR_POSITION} geometry={assets.star} material={assets.starMaterial} />
      <sprite position={STAR_POSITION} scale={[STAR.GLOW, STAR.GLOW, 1]} material={assets.starGlow} />

      <InstancedProp geometry={assets.giftBox} material={assets.giftPaper} placements={GIFTS} />
      <InstancedProp geometry={assets.giftBox} material={assets.ribbon} placements={RIBBONS} offset={RIBBON_X} />
      <InstancedProp geometry={assets.giftBox} material={assets.ribbon} placements={RIBBONS} offset={RIBBON_Z} />
    </group>
  );
}
