'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { NeonStrip } from './NeonStrip';
import { selectHtmlOverlayTargetReady } from './html-overlay-target';
import { useRenderQuality } from './render-quality';

/**
 * Neon title and subtitle, rendered as DOM overlays via drei Html
 */
function BannerNeonText() {
  return (
    <>
      <Html
        position={[0, 0.3, 0.2]}
        center
        transform
        distanceFactor={8}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            fontFamily: 'Impact, Arial Black, sans-serif',
            fontSize: '72px',
            fontWeight: 'bold',
            color: '#ff66aa',
            textShadow: `
              0 0 10px #ff66aa,
              0 0 20px #ff66aa,
              0 0 40px #ff3388,
              0 0 60px #ff3388,
              0 0 80px #ff0066
            `,
            letterSpacing: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          WIZARD PARTY
        </div>
      </Html>

      {/* Subtitle */}
      <Html
        position={[0, -0.8, 0.2]}
        center
        transform
        distanceFactor={8}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#66ffaa',
            textShadow: `
              0 0 10px #66ffaa,
              0 0 20px #66ffaa,
              0 0 30px #44dd88,
              0 0 40px #22bb66
            `,
            letterSpacing: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          * CASINO ROYALE *
        </div>
      </Html>
    </>
  );
}

/** Pulsing pink light cast by the sign (a room accent light: high tiers only). */
function BannerGlowLight() {
  const glowRef = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    if (glowRef.current) {
      glowRef.current.intensity = 3 + Math.sin(state.clock.elapsedTime * 2) * 0.5;
    }
  });
  return <pointLight ref={glowRef} position={[0, 0, 3]} color="#ff66aa" intensity={3} distance={15} decay={2} />;
}

/**
 * Glowing casino banner with neon sign effect
 */
export function CasinoBanner() {
  // Mount the DOM overlays only once their target is final (see html-overlay-target.ts)
  const htmlTargetReady = useThree(selectHtmlOverlayTargetReady);
  const { profile } = useRenderQuality();

  return (
    <group position={[0, 6, -12]}>
      {/* Background panel */}
      <mesh position={[0, 0, -0.2]}>
        <boxGeometry args={[12, 3, 0.3]} />
        <meshStandardMaterial color="#0a0515" metalness={0.2} roughness={0.8} />
      </mesh>

      {/* Gold frame */}
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[12.3, 0.12, 0.4]} />
        <meshStandardMaterial color="#d4a84b" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, -1.6, 0]}>
        <boxGeometry args={[12.3, 0.12, 0.4]} />
        <meshStandardMaterial color="#d4a84b" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[-6.1, 0, 0]}>
        <boxGeometry args={[0.12, 3.3, 0.4]} />
        <meshStandardMaterial color="#d4a84b" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[6.1, 0, 0]}>
        <boxGeometry args={[0.12, 3.3, 0.4]} />
        <meshStandardMaterial color="#d4a84b" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Neon text using Html component */}
      {htmlTargetReady ? <BannerNeonText /> : null}

      {profile.roomAccentLights ? <BannerGlowLight /> : null}

      {/* Corner neon accents */}
      <NeonStrip position={[-5.8, 0, 0.2]} rotation={[0, 0, Math.PI / 2]} length={2.8} color="#ffaa00" />
      <NeonStrip position={[5.8, 0, 0.2]} rotation={[0, 0, Math.PI / 2]} length={2.8} color="#ffaa00" />
    </group>
  );
}
