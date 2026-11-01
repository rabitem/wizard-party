import * as THREE from 'three';

export interface CardLandDustProps {
  position: [number, number, number];
  active: boolean;
  color?: string;
  onComplete?: () => void;
}

export interface ParticleData {
  positions: Float32Array;
  velocities: THREE.Vector3[];
  sizes: number[];
  colors: Float32Array;
  particleCount: number;
}
