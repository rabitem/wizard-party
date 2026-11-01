'use client';

import { motion } from 'motion/react';

const EMBER_IDS = Array.from({ length: 12 }, (_, i) => `ember-${i}`);

export function EmberParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {EMBER_IDS.map((id, i) => (
        <motion.div
          key={id}
          className="absolute rounded-full"
          style={{
            width: `${2 + (i % 3)}px`,
            height: `${2 + (i % 3)}px`,
            background: i % 2 === 0
              ? 'radial-gradient(circle, var(--accent) 0%, transparent 70%)'
              : 'radial-gradient(circle, #a84632 0%, transparent 70%)',
            left: `${10 + (i * 7)}%`,
            bottom: '10%',
            filter: 'blur(0.5px)',
          }}
          animate={{
            y: [0, -400 - (i * 30)],
            x: [0, (i % 2 === 0 ? 20 : -20) * Math.sin(i)],
            opacity: [0, 0.8, 0.6, 0],
            scale: [0.5, 1, 0.8, 0.3],
          }}
          transition={{
            duration: 4 + (i % 3),
            repeat: Infinity,
            delay: i * 0.4,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}
