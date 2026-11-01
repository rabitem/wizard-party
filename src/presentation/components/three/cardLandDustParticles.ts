import * as THREE from 'three';
import { CARD_LAND_DUST } from '../../config/physics.config';
import type { ParticleData } from './cardLandDust.types';
import { seededRandom } from './particleUtils';

/**
 * Generates particle data for the dust effect.
 * Creates positions, velocities, sizes, and colors for each particle.
 */
export function generateParticleData(color: string, triggerCount: number): ParticleData {
  // Use triggerCount multiplied by large prime for varied patterns
  // The triggerCount is incremented each time dust is triggered
  const rand = seededRandom(triggerCount * 127919 + 42);
  const particleCount = CARD_LAND_DUST.PARTICLE_COUNT;
  const positions = new Float32Array(particleCount * 3);
  const velocities: THREE.Vector3[] = [];
  const sizes: number[] = [];
  const particleColors = new Float32Array(particleCount * 3);

  const baseColor = new THREE.Color(color);
  const lightColor = new THREE.Color(CARD_LAND_DUST.COLOR_LIGHT);
  const darkColor = new THREE.Color(CARD_LAND_DUST.COLOR_DARK);

  const speedRange = CARD_LAND_DUST.SPREAD_SPEED_MAX - CARD_LAND_DUST.SPREAD_SPEED_MIN;
  const upwardRange = CARD_LAND_DUST.UPWARD_MAX - CARD_LAND_DUST.UPWARD_MIN;

  for (let i = 0; i < particleCount; i++) {
    // Start at impact point
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;

    // Radial outward velocity - flat disc pattern (dust on table)
    const theta = rand() * Math.PI * 2;
    const speed = CARD_LAND_DUST.SPREAD_SPEED_MIN + rand() * speedRange;
    const upwardBias = CARD_LAND_DUST.UPWARD_MIN + rand() * upwardRange;

    velocities.push(
      new THREE.Vector3(
        Math.cos(theta) * speed,
        upwardBias,
        Math.sin(theta) * speed
      )
    );

    // Varying sizes for dust particles
    sizes.push(0.02 + rand() * 0.03);

    // Mix of dust colors
    const colorChoice = rand();
    let particleColor: THREE.Color;
    if (colorChoice < 0.4) {
      particleColor = baseColor;
    } else if (colorChoice < 0.7) {
      particleColor = lightColor;
    } else {
      particleColor = darkColor;
    }

    particleColors[i * 3] = particleColor.r;
    particleColors[i * 3 + 1] = particleColor.g;
    particleColors[i * 3 + 2] = particleColor.b;
  }

  return { positions, velocities, sizes, colors: particleColors, particleCount };
}

/**
 * Updates particle positions based on elapsed time.
 * Applies physics simulation including gravity and drag.
 */
export function updateParticlePositions(
  posArray: Float32Array,
  particleData: ParticleData,
  elapsed: number
): void {
  const gravity = CARD_LAND_DUST.GRAVITY;
  const drag = CARD_LAND_DUST.DRAG;

  for (let i = 0; i < particleData.particleCount; i++) {
    const velocity = particleData.velocities[i];

    // Apply drag to horizontal velocity over time
    const dragFactor = Math.pow(drag, elapsed * 60);

    posArray[i * 3] = velocity.x * elapsed * dragFactor;
    posArray[i * 3 + 1] = Math.max(0, velocity.y * elapsed + 0.5 * gravity * elapsed * elapsed);
    posArray[i * 3 + 2] = velocity.z * elapsed * dragFactor;
  }
}

/**
 * Calculates particle opacity based on animation progress.
 * Uses a power curve for quick fade out effect.
 */
export function calculateOpacity(progress: number): number {
  return CARD_LAND_DUST.MAX_OPACITY * (1 - Math.pow(progress, 1.5));
}
