'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

interface OpponentHandProps {
  cardCount: number;
  position: [number, number, number];
  rotation: number; // Y rotation to face the table center
}

const CARD_WIDTH = 0.5;
const CARD_HEIGHT = 0.72;
const CARD_THICKNESS = 0.015;

// Card back colors
const CARD_BACK_PRIMARY = '#0a1628';
const CARD_BACK_GOLD = '#c9a227';

export function OpponentHand({ cardCount, position, rotation }: OpponentHandProps) {

  // Create card back texture
  const backTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 384;
    const ctx = canvas.getContext('2d')!;

    // Background
    const bgGrad = ctx.createRadialGradient(128, 192, 0, 128, 192, 250);
    bgGrad.addColorStop(0, '#1a2a48');
    bgGrad.addColorStop(1, CARD_BACK_PRIMARY);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 256, 384);

    // Border
    ctx.strokeStyle = CARD_BACK_GOLD;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 240, 368);

    // Inner border
    ctx.strokeStyle = '#8b7355';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, 224, 352);

    // Center design - simple star
    ctx.fillStyle = CARD_BACK_GOLD;
    ctx.beginPath();
    const cx = 128, cy = 192;
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? 50 : 20;
      const angle = (i * Math.PI) / 4 - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Inner circle
    ctx.fillStyle = '#1a2a48';
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  // Calculate card positions - flat on table with fan spread
  const cardPositions = useMemo(() => {
    const cards: { x: number; y: number; z: number; rotZ: number }[] = [];

    if (cardCount === 0) return cards;

    // Fan spread settings - cards laid flat on table
    const maxSpread = 1.0; // Total width of the fan
    const spreadPerCard = Math.min(0.15, maxSpread / Math.max(cardCount - 1, 1));
    const totalWidth = spreadPerCard * (cardCount - 1);
    const startX = -totalWidth / 2;

    // Fan arc settings - slight rotation for each card
    const arcAngle = Math.min(0.4, 0.06 * cardCount); // Max arc rotation

    for (let i = 0; i < cardCount; i++) {
      const t = cardCount > 1 ? i / (cardCount - 1) : 0.5;
      const x = startX + i * spreadPerCard;
      const y = i * 0.004; // Stack slightly for depth (each card slightly higher)
      const z = 0; // All cards at same z since they're flat
      const rotZ = (t - 0.5) * arcAngle; // Fan rotation around vertical axis

      cards.push({ x, y, z, rotZ });
    }

    return cards;
  }, [cardCount]);

  if (cardCount === 0) return null;

  return (
    <group
      position={position}
      rotation={[0, rotation, 0]} // Orient toward player's seat
    >
      {cardPositions.map((card, i) => (
        <mesh
          key={i}
          position={[card.x, card.y, card.z]}
          rotation={[-Math.PI / 2, 0, card.rotZ]} // Flat on table (-90° X rotation)
        >
          <boxGeometry args={[CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS]} />
          <meshBasicMaterial attach="material-0" color="#2a2a3a" />
          <meshBasicMaterial attach="material-1" color="#2a2a3a" />
          <meshBasicMaterial attach="material-2" color="#2a2a3a" />
          <meshBasicMaterial attach="material-3" color="#2a2a3a" />
          <meshBasicMaterial attach="material-4" map={backTexture} />
          <meshBasicMaterial attach="material-5" map={backTexture} />
        </mesh>
      ))}
    </group>
  );
}
