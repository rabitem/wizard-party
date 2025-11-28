'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CollectingCardProps {
  card: { id: string; type: string; suit: string | null; value: number | null };
  startPosition: [number, number, number];
  targetPosition: [number, number, number];
  delay: number;
  rotation: number;
}

export function CollectingCard({ startPosition, targetPosition, delay }: CollectingCardProps) {
  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef<number | null>(null);

  const GATHER_DURATION = 0.4;
  const WAIT_DURATION = 0.3;
  const FLY_DURATION = 0.5;

  const backTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 384;
    const ctx = canvas.getContext('2d')!;

    const bgGrad = ctx.createRadialGradient(128, 192, 0, 128, 192, 250);
    bgGrad.addColorStop(0, '#1a2a48');
    bgGrad.addColorStop(1, '#0a1628');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 256, 384);

    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 240, 368);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;

    if (startTime.current === null) {
      startTime.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - startTime.current - delay;
    if (elapsed < 0) {
      groupRef.current.position.set(startPosition[0], startPosition[1], startPosition[2]);
      return;
    }

    const centerPos: [number, number, number] = [0, 0.25, 0];

    let x: number, y: number, z: number;
    let scale = 0.9;
    let rotZ = 0;

    if (elapsed < GATHER_DURATION) {
      const t = elapsed / GATHER_DURATION;
      const easeOut = 1 - Math.pow(1 - t, 3);
      x = THREE.MathUtils.lerp(startPosition[0], centerPos[0], easeOut);
      z = THREE.MathUtils.lerp(startPosition[2], centerPos[2], easeOut);
      const arc = Math.sin(t * Math.PI) * 0.4;
      y = THREE.MathUtils.lerp(startPosition[1], centerPos[1], easeOut) + arc;
      rotZ = t * Math.PI * 0.5;
    } else if (elapsed < GATHER_DURATION + WAIT_DURATION) {
      const t = (elapsed - GATHER_DURATION) / WAIT_DURATION;
      x = centerPos[0];
      z = centerPos[2];
      y = centerPos[1] + Math.sin(t * Math.PI * 2) * 0.02;
      rotZ = Math.PI * 0.5;
      scale = 0.85;
    } else {
      const t = (elapsed - GATHER_DURATION - WAIT_DURATION) / FLY_DURATION;
      const easeInOut = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      x = THREE.MathUtils.lerp(centerPos[0], targetPosition[0], easeInOut);
      z = THREE.MathUtils.lerp(centerPos[2], targetPosition[2], easeInOut);
      const arc = Math.sin(t * Math.PI) * 0.6;
      y = THREE.MathUtils.lerp(centerPos[1], targetPosition[1], easeInOut) + arc;
      rotZ = Math.PI * 0.5 + t * Math.PI;
      scale = THREE.MathUtils.lerp(0.85, 0.4, easeInOut);
    }

    groupRef.current.position.set(x, y, z);
    groupRef.current.rotation.set(-Math.PI / 2, 0, rotZ);
    groupRef.current.scale.setScalar(scale);
  });

  return (
    <group ref={groupRef} position={startPosition}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.5, 0.72, 0.015]} />
        <meshBasicMaterial attach="material-0" color="#2a2a3a" />
        <meshBasicMaterial attach="material-1" color="#2a2a3a" />
        <meshBasicMaterial attach="material-2" color="#2a2a3a" />
        <meshBasicMaterial attach="material-3" color="#2a2a3a" />
        <meshBasicMaterial attach="material-4" map={backTexture} />
        <meshBasicMaterial attach="material-5" map={backTexture} />
      </mesh>
    </group>
  );
}
