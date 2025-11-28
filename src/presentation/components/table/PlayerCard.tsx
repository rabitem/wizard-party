'use client';

import { Text, Billboard } from '@react-three/drei';
import { IPlayer } from '@shared/domain';
import { AVATAR_PRESETS, loadGameSettings } from '../SettingsPanel';

interface PlayerCardProps {
  position: [number, number, number];
  player: IPlayer;
  isCurrentTurn: boolean;
  isLocalPlayer: boolean;
  playerIndex: number;
}

export function PlayerCard({ position, player, isCurrentTurn, isLocalPlayer, playerIndex }: PlayerCardProps) {
  const getAvatarEmoji = () => {
    if (isLocalPlayer) {
      const settings = loadGameSettings();
      const avatarPreset = AVATAR_PRESETS.find((a) => a.id === settings.avatar);
      return avatarPreset?.emoji || AVATAR_PRESETS[0].emoji;
    }
    return AVATAR_PRESETS[playerIndex % AVATAR_PRESETS.length].emoji;
  };
  const avatarEmoji = getAvatarEmoji();

  const bidMade = player.bid !== null && player.bid !== undefined;
  const bidCorrect = bidMade && player.tricksWon === player.bid;
  const bidOver = bidMade && player.bid !== null && player.tricksWon > player.bid;

  const bgColor = '#0a0a15';
  const borderColor = isCurrentTurn ? '#f59e0b' : '#3d2804';
  const accentColor = '#f59e0b';
  const textColor = '#fef3c7';
  const mutedText = '#967219';

  return (
    <Billboard position={position} follow={true} lockX={false} lockY={false} lockZ={false}>
      {/* Outer glow when current turn */}
      {isCurrentTurn && (
        <mesh position={[0, 0, -0.04]}>
          <planeGeometry args={[1.15, 0.58]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.15} />
        </mesh>
      )}

      {/* Border */}
      <mesh position={[0, 0, -0.03]}>
        <planeGeometry args={[1.08, 0.52]} />
        <meshBasicMaterial color={borderColor} />
      </mesh>

      {/* Card background */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[1.04, 0.48]} />
        <meshBasicMaterial color={bgColor} />
      </mesh>

      {/* Avatar circle */}
      <mesh position={[-0.38, 0.06, -0.01]}>
        <circleGeometry args={[0.12, 24]} />
        <meshBasicMaterial color="#15152a" />
      </mesh>
      <mesh position={[-0.38, 0.06, 0]}>
        <ringGeometry args={[0.11, 0.12, 24]} />
        <meshBasicMaterial color={isCurrentTurn ? accentColor : '#3d2804'} />
      </mesh>

      {/* Avatar emoji */}
      <Text position={[-0.38, 0.06, 0.01]} fontSize={0.14} anchorX="center" anchorY="middle">
        {avatarEmoji}
      </Text>

      {/* Player name */}
      <Text
        position={[0.08, 0.12, 0]}
        fontSize={0.08}
        color={isCurrentTurn ? accentColor : textColor}
        anchorX="center"
        anchorY="middle"
        maxWidth={0.55}
      >
        {player.name}
        {isLocalPlayer ? ' ★' : ''}
      </Text>

      {/* Score */}
      <Text position={[0.08, -0.02, 0]} fontSize={0.12} color={textColor} anchorX="center" anchorY="middle">
        {player.score}
      </Text>
      <Text
        position={[0.08, -0.12, 0]}
        fontSize={0.04}
        color={mutedText}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.1}
      >
        POINTS
      </Text>

      {/* Divider line */}
      <mesh position={[0, -0.17, -0.01]}>
        <planeGeometry args={[0.9, 0.006]} />
        <meshBasicMaterial color="#1f1a0a" />
      </mesh>

      {/* Bid/Won row */}
      <group position={[0, -0.22, 0]}>
        {/* Bid box */}
        <mesh position={[-0.25, 0, -0.01]}>
          <planeGeometry args={[0.35, 0.08]} />
          <meshBasicMaterial color="#15152a" />
        </mesh>
        <Text position={[-0.35, 0, 0]} fontSize={0.04} color={mutedText} anchorX="center" anchorY="middle">
          BID
        </Text>
        <Text
          position={[-0.18, 0, 0]}
          fontSize={0.055}
          color={bidMade ? '#60a5fa' : '#666666'}
          anchorX="center"
          anchorY="middle"
        >
          {player.bid ?? '-'}
        </Text>

        {/* Won box */}
        <mesh position={[0.25, 0, -0.01]}>
          <planeGeometry args={[0.35, 0.08]} />
          <meshBasicMaterial color={bidCorrect ? '#15251a' : bidOver ? '#251515' : '#15152a'} />
        </mesh>
        <Text position={[0.15, 0, 0]} fontSize={0.04} color={mutedText} anchorX="center" anchorY="middle">
          WON
        </Text>
        <Text
          position={[0.32, 0, 0]}
          fontSize={0.055}
          color={bidCorrect ? '#4ade80' : bidOver ? '#f87171' : textColor}
          anchorX="center"
          anchorY="middle"
        >
          {player.tricksWon}
        </Text>
      </group>
    </Billboard>
  );
}
