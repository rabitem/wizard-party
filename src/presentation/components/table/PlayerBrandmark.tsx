'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { SceneText } from '../three/SceneText';
import { DECORATIVE_TEXT_USER_DATA } from '../three/scene-text-roles';
import * as THREE from 'three';
import { IPlayer } from '@shared/domain';
import { AVATAR_PRESETS } from '../settings';
import { useAvatarId } from '../account/PlayerAvatar';
import { CAMERA_CONFIG } from '../../config/layout.config';
import { SeatNameplate } from './SeatNameplate';

interface PlayerBrandmarkProps {
  position: [number, number, number];
  rotation: number;
  player: IPlayer;
  isCurrentTurn: boolean;
  isLocalPlayer: boolean;
  playerIndex: number;
}

/** Plate footprint, shared with the camera framing so every plate stays on screen */
const { SEAT_PLATE } = CAMERA_CONFIG.FRAMING;

// Branded/engraved color palette
const BRAND_COLORS = {
  burned: '#2a1505',
  burnedLight: '#8b6914',
  charred: '#1a0d02',
  gold: '#d4a84b',
  goldBright: '#ffd700',
  success: '#4a9e4a',
  danger: '#c45c5c',
  neutral: '#7a5a30',
} as const;

/** Get avatar symbol for player */
function getAvatarSymbol(isLocalPlayer: boolean, playerIndex: number, localAvatarId: string): string {
  if (isLocalPlayer) {
    const preset = AVATAR_PRESETS.find((a) => a.id === localAvatarId);
    return preset?.symbol || AVATAR_PRESETS[0].symbol;
  }
  return AVATAR_PRESETS[playerIndex % AVATAR_PRESETS.length].symbol;
}

/** Get color based on turn state */
function getTurnColor(isCurrentTurn: boolean, defaultColor: string): string {
  return isCurrentTurn ? BRAND_COLORS.goldBright : defaultColor;
}

/** Turn indicator glow - ember effect */
function TurnIndicatorGlow({ glowRef }: { glowRef: React.RefObject<THREE.Mesh | null> }) {
  return (
    <mesh ref={glowRef} position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.75, 0.2]} />
      <meshBasicMaterial color={BRAND_COLORS.goldBright} transparent opacity={0.3} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

/** Brass divider line */
function BrassDivider({ xPos }: { xPos: number }) {
  return (
    <mesh position={[xPos, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.004, 0.1]} />
      <meshStandardMaterial color={BRAND_COLORS.gold} roughness={0.3} metalness={0.7} />
    </mesh>
  );
}

/**
 * The static part of a seat plate (plate, gold ring, brass dividers). It never changes during a
 * game, so the rim renders all seats' plates in one static batch (WoodTableRim).
 */
export function SeatPlate({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[SEAT_PLATE.HALF_LENGTH * 2, SEAT_PLATE.HALF_DEPTH * 2]} /><meshStandardMaterial color={BRAND_COLORS.charred} roughness={0.9} metalness={0.1} /></mesh>
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.33, 0.35, 4]} /><meshStandardMaterial color={BRAND_COLORS.gold} roughness={0.3} metalness={0.8} /></mesh>
      <BrassDivider xPos={-0.2} />
      <BrassDivider xPos={0.2} />
    </group>
  );
}

/**
 * Seat plate branded into the wooden table rim: the live decoration on top of its SeatPlate
 * (avatar emblem, turn glow). Who sits there and their bid progress are on the SeatNameplate, a
 * camera-facing label of constant on-screen size, because text engraved flat on the rim
 * shrinks to a few pixels on phones.
 */
export function PlayerBrandmark({ position, rotation, player, isCurrentTurn, isLocalPlayer, playerIndex }: PlayerBrandmarkProps) {
  const glowRef = useRef<THREE.Mesh>(null);
  const avatarSymbol = getAvatarSymbol(isLocalPlayer, playerIndex, useAvatarId());

  useFrame((state) => {
    if (isCurrentTurn && glowRef.current) (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(state.clock.elapsedTime * 2.5) * 0.1;
  });

  return (
    <>
      <group position={position} rotation={[0, rotation, 0]}>
        {isCurrentTurn ? <TurnIndicatorGlow glowRef={glowRef} /> : null}
        <SceneText position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} userData={DECORATIVE_TEXT_USER_DATA} fontSize={0.09} color={getTurnColor(isCurrentTurn, BRAND_COLORS.gold)} anchorX="center" anchorY="middle">{avatarSymbol}</SceneText>
        {isLocalPlayer ? <mesh position={[0.1, 0.008, 0.04]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.015, 8]} /><meshStandardMaterial color={BRAND_COLORS.goldBright} emissive={BRAND_COLORS.goldBright} emissiveIntensity={0.5} /></mesh> : null}
      </group>
      <SeatNameplate brandmarkPosition={position} player={player} isCurrentTurn={isCurrentTurn} isLocalPlayer={isLocalPlayer} />
    </>
  );
}
