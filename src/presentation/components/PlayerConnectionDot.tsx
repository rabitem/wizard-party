'use client';

/**
 * Connection status indicator dot for players
 *
 * Displays:
 * - Green dot with glow: Connected
 * - Amber dot with pulse: In grace period (disconnected but can rejoin)
 * - Red dot with pulse: Disconnected
 * - Nothing: Bots (always connected by definition)
 */

interface PlayerConnectionDotProps {
  isConnected: boolean;
  isBot: boolean;
  isGraced?: boolean;
  size?: 'sm' | 'md';
}

export function PlayerConnectionDot({
  isConnected,
  isBot,
  isGraced = false,
  size = 'sm',
}: PlayerConnectionDotProps) {
  // Bots don't show connection indicators
  if (isBot) {
    return null;
  }

  const sizeClasses = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';

  // Determine the state and corresponding styles
  if (isConnected) {
    // Connected: Green dot with subtle glow
    return (
      <div
        className={`${sizeClasses} rounded-full flex-shrink-0`}
        style={{
          background: '#10b981',
          boxShadow: '0 0 6px rgba(16, 185, 129, 0.5)',
        }}
        title="Connected"
        aria-label="Player is connected"
      />
    );
  }

  if (isGraced) {
    // Grace period: Amber dot with pulse
    return (
      <div
        className={`${sizeClasses} rounded-full flex-shrink-0 animate-pulse`}
        style={{
          background: 'var(--color-amber-500)',
          boxShadow: '0 0 6px color-mix(in srgb, var(--color-amber-500) 50%, transparent)',
        }}
        title="Reconnecting..."
        aria-label="Player is reconnecting"
      />
    );
  }

  // Disconnected: Red dot with pulse
  return (
    <div
      className={`${sizeClasses} rounded-full flex-shrink-0 animate-pulse`}
      style={{
        background: '#ef4444',
        boxShadow: '0 0 6px color-mix(in srgb, var(--color-amber-600) 50%, transparent)',
      }}
      title="Disconnected"
      aria-label="Player is disconnected"
    />
  );
}
