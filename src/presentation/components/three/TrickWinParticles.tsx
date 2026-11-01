'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { seededRandom } from './particleUtils';
import { IDLE_TRICK_WIN_BURST, stepTrickWinBurst, type TrickWinBurstState } from './trick-win-burst';
import { softPointSize } from '../../config/particle-sprite.config';
import { SoftPointsMaterial } from './particles/SoftPointsMaterial';

/** Sparkle point size and its twinkle (size of the equivalent square point) */
const TWINKLE = { BASE_SIZE: 0.1, AMPLITUDE: 0.02, SPEED: 10 } as const;

// =============================================================================
// TrickWinParticles Component
// Celebratory particle burst effect for trick wins
// =============================================================================

interface TrickWinParticlesProps {
  position: [number, number, number];
  active: boolean;
  color?: string;
  onComplete?: () => void;
}

// Particle configuration
const PARTICLE_COUNT = 120;
const CONFETTI_COUNT = 60;
const DURATION = 1.5; // Quick burst

// Confetti colors - festive palette
const CONFETTI_COLORS = [
  '#ffd700', // gold
  '#ff6b6b', // red
  '#4ecdc4', // teal
  '#ffe66d', // yellow
  '#ff8c42', // orange
  '#a855f7', // purple
  '#3b82f6', // blue
  '#22c55e', // green
  '#f472b6', // pink
  '#ffffff', // white
];

/** Update sparkle particles physics and appearance */
function updateSparkleParticles(
  pointsRef: React.RefObject<THREE.Points | null>,
  velocities: THREE.Vector3[],
  elapsed: number,
  progress: number
): void {
  if (!pointsRef.current) return;

  const positionAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
  const posArray = positionAttr.array as Float32Array;
  const gravity = -6;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const velocity = velocities[i];
    posArray[i * 3] = velocity.x * elapsed;
    posArray[i * 3 + 1] = velocity.y * elapsed + 0.5 * gravity * elapsed * elapsed;
    posArray[i * 3 + 2] = velocity.z * elapsed;
  }

  positionAttr.needsUpdate = true;

  const material = pointsRef.current.material as THREE.PointsMaterial;
  material.opacity = Math.max(0, 1 - Math.pow(progress, 1.5));
  material.size = softPointSize(TWINKLE.BASE_SIZE + Math.sin(elapsed * TWINKLE.SPEED) * TWINKLE.AMPLITUDE);
}

/** Update confetti physics with flutter effect */
function updateConfettiParticles(
  confettiRef: React.RefObject<THREE.InstancedMesh | null>,
  confettiData: { velocity: THREE.Vector3; rotationSpeed: THREE.Vector3; delay: number; flutter: number }[],
  dummy: THREE.Object3D,
  elapsed: number
): void {
  if (!confettiRef.current) return;

  const gravity = -3;

  for (let i = 0; i < CONFETTI_COUNT; i++) {
    const data = confettiData[i];
    const t = Math.max(0, elapsed - data.delay);

    if (t <= 0) {
      dummy.position.set(0, -100, 0);
    } else {
      // Position with flutter
      const flutter = Math.sin(t * data.flutter) * 0.3;
      dummy.position.set(
        data.velocity.x * t + flutter,
        data.velocity.y * t + 0.5 * gravity * t * t,
        data.velocity.z * t + Math.cos(t * data.flutter * 0.7) * 0.2
      );

      // Rotation
      dummy.rotation.set(
        data.rotationSpeed.x * t,
        data.rotationSpeed.y * t,
        data.rotationSpeed.z * t
      );

      // Scale fade out
      const fadeProgress = Math.min(1, t / (DURATION - data.delay));
      const scale = 1 - Math.pow(fadeProgress, 3);
      dummy.scale.setScalar(scale);
    }

    dummy.updateMatrix();
    confettiRef.current.setMatrixAt(i, dummy.matrix);
  }

  confettiRef.current.instanceMatrix.needsUpdate = true;
}

/** Select particle color based on random value */
function getParticleColor(colorChoice: number, colors: THREE.Color[]): THREE.Color {
  if (colorChoice < 0.5) return colors[0];
  if (colorChoice < 0.75) return colors[1];
  return colors[2];
}

/** Generate sparkle particle data */
function generateSparkleData(color: string) {
  const rand = seededRandom(123);
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const velocities: THREE.Vector3[] = [];
  const particleColors = new Float32Array(PARTICLE_COUNT * 3);
  const colors = [new THREE.Color('#ffd700'), new THREE.Color('#ffffff'), new THREE.Color('#ff8c42')];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3] = positions[i * 3 + 1] = positions[i * 3 + 2] = 0;
    const burstType = Math.floor(rand() * 3);
    let speed: number, theta: number, phi: number;
    if (burstType === 0) { theta = rand() * Math.PI * 2; phi = rand() * Math.PI * 0.4; speed = 3 + rand() * 3; }
    else if (burstType === 1) { theta = (i / PARTICLE_COUNT) * Math.PI * 8 + rand() * 0.5; phi = Math.PI * 0.3 + rand() * 0.3; speed = 2 + rand() * 2; }
    else { theta = rand() * Math.PI * 2; phi = rand() * Math.PI; speed = 1.5 + rand() * 2.5; }
    velocities.push(new THREE.Vector3(Math.sin(phi) * Math.cos(theta) * speed, Math.abs(Math.cos(phi)) * speed * 1.8 + 2, Math.sin(phi) * Math.sin(theta) * speed));
    const colorChoice = rand();
    const particleColor = getParticleColor(colorChoice, colors);
    particleColors[i * 3] = particleColor.r; particleColors[i * 3 + 1] = particleColor.g; particleColors[i * 3 + 2] = particleColor.b;
  }
  return { positions, velocities, colors: particleColors };
}

/** Generate confetti particle data */
function generateConfettiData() {
  const rand = seededRandom(789);
  const data: { velocity: THREE.Vector3; rotationSpeed: THREE.Vector3; color: THREE.Color; delay: number; flutter: number }[] = [];
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    const theta = rand() * Math.PI * 2;
    const speed = 2 + rand() * 4;
    data.push({
      velocity: new THREE.Vector3(Math.cos(theta) * speed * 0.8, 4 + rand() * 4, Math.sin(theta) * speed * 0.8),
      rotationSpeed: new THREE.Vector3((rand() - 0.5) * 15, (rand() - 0.5) * 15, (rand() - 0.5) * 15),
      color: new THREE.Color(CONFETTI_COLORS[Math.floor(rand() * CONFETTI_COLORS.length)]),
      delay: rand() * 0.3, flutter: 2 + rand() * 3,
    });
  }
  return data;
}

/** Sparkle particles mesh */
function SparkleParticles({ pointsRef, positions, particleColors }: { pointsRef: React.RefObject<THREE.Points | null>; positions: Float32Array; particleColors: Float32Array }) {
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[particleColors, 3]} />
      </bufferGeometry>
      <SoftPointsMaterial sprite="spark" size={TWINKLE.BASE_SIZE} vertexColors opacity={0} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/** Confetti instanced mesh */
function ConfettiMesh({ confettiRef, confettiColorsArray }: { confettiRef: React.RefObject<THREE.InstancedMesh | null>; confettiColorsArray: Float32Array }) {
  return (
    <instancedMesh ref={confettiRef} args={[undefined, undefined, CONFETTI_COUNT]}>
      <planeGeometry args={[0.08, 0.12]} />
      <meshBasicMaterial vertexColors transparent opacity={0.9} side={THREE.DoubleSide} depthWrite={false} />
      <instancedBufferAttribute attach="geometry-attributes-color" args={[confettiColorsArray, 3]} />
    </instancedMesh>
  );
}

export function TrickWinParticles({ position, active, color = '#ffd700', onComplete }: TrickWinParticlesProps) {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const confettiRef = useRef<THREE.InstancedMesh>(null);
  const burstRef = useRef<TrickWinBurstState>(IDLE_TRICK_WIN_BURST);

  const { positions, velocities, colors: particleColors } = useMemo(() => generateSparkleData(color), [color]);
  const confettiData = useMemo(() => generateConfettiData(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const confettiColorsArray = useMemo(() => {
    const arr = new Float32Array(CONFETTI_COUNT * 3);
    confettiData.forEach((d, i) => { arr[i * 3] = d.color.r; arr[i * 3 + 1] = d.color.g; arr[i * 3 + 2] = d.color.b; });
    return arr;
  }, [confettiData]);

  useFrame((state) => {
    const step = stepTrickWinBurst(burstRef.current, active, state.clock.elapsedTime, DURATION);
    burstRef.current = step.state;
    // Drawn only while a burst runs: idle, the confetti would sit at the table centre with
    // identity instance matrices and both meshes would cost a draw call every frame.
    if (groupRef.current) groupRef.current.visible = step.state.animating;
    if (step.completed) onComplete?.();
    if (!step.state.animating) return;
    // The first frame writes every matrix (instances not yet launched park below the table).
    updateSparkleParticles(pointsRef, velocities, step.elapsed, step.progress);
    updateConfettiParticles(confettiRef, confettiData, dummy, step.elapsed);
  });

  return (
    <group ref={groupRef} position={position} visible={false}>
      <SparkleParticles pointsRef={pointsRef} positions={positions} particleColors={particleColors} />
      <ConfettiMesh confettiRef={confettiRef} confettiColorsArray={confettiColorsArray} />
    </group>
  );
}
