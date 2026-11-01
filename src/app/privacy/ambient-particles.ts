export interface ParticleConfig {
  id: string;
  left: number;
  top: number;
  delay: number;
  duration: number;
}

export const ambientParticles: ParticleConfig[] = [
  { id: 'p0', left: 8, top: 10, delay: 0, duration: 2 },
  { id: 'p1', left: 16, top: 28, delay: 0.3, duration: 2.2 },
  { id: 'p2', left: 24, top: 46, delay: 0.6, duration: 2.4 },
  { id: 'p3', left: 32, top: 64, delay: 0.9, duration: 2.6 },
  { id: 'p4', left: 40, top: 82, delay: 1.2, duration: 2.8 },
  { id: 'p5', left: 48, top: 10, delay: 1.5, duration: 3 },
  { id: 'p6', left: 56, top: 28, delay: 1.8, duration: 3.2 },
  { id: 'p7', left: 64, top: 46, delay: 2.1, duration: 3.4 },
  { id: 'p8', left: 72, top: 64, delay: 2.4, duration: 3.6 },
  { id: 'p9', left: 80, top: 82, delay: 2.7, duration: 3.8 },
  { id: 'p10', left: 88, top: 10, delay: 3.0, duration: 4 },
  { id: 'p11', left: 96, top: 28, delay: 3.3, duration: 4.2 },
];
