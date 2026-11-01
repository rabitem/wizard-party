'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';

interface Particle {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
}

export function AmbientParticles() {
  const particles = useMemo<Particle[]>(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: (i * 7 + (i % 5) * 5) % 100,
      top: (i * 6 + (i % 4) * 7) % 100,
      size: 1 + (i % 3) * 0.5,
      duration: 3 + (i % 4) * 1,
      delay: (i % 6) * 0.5,
    })),
  []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            background: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 60%, transparent) 0%, color-mix(in srgb, var(--accent) 0%, transparent) 70%)',
          }}
          animate={{ opacity: [0.1, 0.4, 0.1], scale: [1, 1.5, 1] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }}
        />
      ))}
    </div>
  );
}
