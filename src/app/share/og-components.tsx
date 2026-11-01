// Helper components for OpenGraph image generation

export function getMedalColor(position: number): string {
  if (position === 0) return "#ffd700"; // Gold
  if (position === 1) return "#c0c0c0"; // Silver
  if (position === 2) return "#cd7f32"; // Bronze
  return "#6b5a42";
}

function MedalNumber({
  value,
  color,
  size,
  top,
  fontSize,
}: {
  value: number;
  color: string;
  size: number;
  top: number;
  fontSize: number;
}) {
  return (
    <span
      style={{
        position: "absolute",
        top,
        left: 0,
        width: size,
        fontSize,
        lineHeight: 1,
        color,
        fontFamily: "Georgia, serif",
        textAlign: "center",
      }}
    >
      {value}
    </span>
  );
}

// SVG icons for medals
export function MedalIcon({ position, size = 24 }: { position: number; size?: number }) {
  if (position === 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#ffd700">
        <path d="M12 2L15 8L22 9L17 14L18 21H6L7 14L2 9L9 8L12 2Z" />
        <rect x="6" y="18" width="12" height="3" rx="1" />
      </svg>
    );
  }
  if (position === 1) {
    return (
      <div style={{ width: size, height: size, position: "relative", display: "flex" }}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#c0c0c0">
          <circle cx="12" cy="14" r="8" />
          <path d="M8 2L12 8L16 2" fill="none" stroke="#c0c0c0" strokeWidth="2" />
        </svg>
        <MedalNumber value={2} color="#666" size={size} top={size * 0.53} fontSize={size * 0.34} />
      </div>
    );
  }
  if (position === 2) {
    return (
      <div style={{ width: size, height: size, position: "relative", display: "flex" }}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#cd7f32">
          <circle cx="12" cy="14" r="8" />
          <path d="M8 2L12 8L16 2" fill="none" stroke="#cd7f32" strokeWidth="2" />
        </svg>
        <MedalNumber value={3} color="#5c3c1f" size={size} top={size * 0.53} fontSize={size * 0.34} />
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, position: "relative", display: "flex" }}>
      <svg width={size} height={size} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="#3d3020" stroke="#6b5a42" strokeWidth="2" />
      </svg>
      <MedalNumber value={position + 1} color="#8b7355" size={size} top={size * 0.34} fontSize={size * 0.42} />
    </div>
  );
}

export function TrophyIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="trophyGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffd700" />
          <stop offset="50%" stopColor="#d4a853" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
      </defs>
      <path d="M12 8H36V12C36 22 30 28 24 28C18 28 12 22 12 12V8Z" fill="url(#trophyGold)" />
      <path d="M12 10H8C6 10 4 12 4 14C4 18 6 20 10 20H12" stroke="url(#trophyGold)" strokeWidth="3" fill="none" />
      <path d="M36 10H40C42 10 44 12 44 14C44 18 42 20 38 20H36" stroke="url(#trophyGold)" strokeWidth="3" fill="none" />
      <rect x="21" y="28" width="6" height="8" fill="url(#trophyGold)" />
      <path d="M14 36H34V40C34 41 33 42 32 42H16C15 42 14 41 14 40V36Z" fill="url(#trophyGold)" />
      <path d="M16 12C16 16 18 20 22 22" stroke="#fff" strokeWidth="2" opacity="0.4" strokeLinecap="round" />
    </svg>
  );
}

interface Player {
  name: string;
  score: number;
  perfect: number;
  rank: number;
  id: string;
}

export function PlayerCard({ player }: { player: Player }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        background: player.rank === 0
          ? "linear-gradient(90deg, rgba(255, 215, 0, 0.15) 0%, rgba(212, 168, 83, 0.05) 100%)"
          : "rgba(61, 48, 32, 0.4)",
        border: player.rank === 0 ? "2px solid rgba(255, 215, 0, 0.4)" : "1px solid #3d3020",
        borderRadius: 12,
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0, flex: 1, overflow: "hidden" }}>
        <div
          style={{
            width: 48,
            height: 48,
            flexShrink: 0,
            borderRadius: "50%",
            background: "linear-gradient(180deg, #252015 0%, #1a1510 100%)",
            border: `3px solid ${getMedalColor(player.rank)}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: player.rank === 0 ? "0 0 16px rgba(255, 215, 0, 0.4)" : "none",
          }}
        >
          <MedalIcon position={player.rank} size={24} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1, overflow: "hidden" }}>
          <span
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: player.rank === 0 ? "#ffd700" : "#fef3c7",
              fontFamily: "Georgia, serif",
              maxWidth: 430,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {player.name}
          </span>
          <span style={{ fontSize: 14, color: "#6b5a42" }}>
            {player.perfect} perfect bids
          </span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
          justifyContent: "flex-end",
          minWidth: 120,
          background: "rgba(212, 168, 83, 0.15)",
          border: "1px solid #4d4030",
          borderRadius: 8,
          padding: "8px 16px",
        }}
      >
        <span
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: player.rank === 0 ? "#ffd700" : "#d4a853",
            fontFamily: "Georgia, serif",
          }}
        >
          {player.score}
        </span>
        <span style={{ fontSize: 16, color: "#8b7355" }}>pts</span>
      </div>
    </div>
  );
}

export function DecorativeBorders() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          right: 16,
          bottom: 16,
          border: "3px solid #3d3020",
          borderRadius: 16,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          right: 20,
          bottom: 20,
          border: "1px solid #d4a853",
          borderRadius: 12,
          display: "flex",
        }}
      />
    </>
  );
}

export function CornerOrnaments() {
  const corners = [
    { id: 'corner-tl', top: 32, left: 32, borderLeft: "3px solid #d4a853", borderTop: "3px solid #d4a853" },
    { id: 'corner-tr', top: 32, right: 32, borderRight: "3px solid #d4a853", borderTop: "3px solid #d4a853" },
    { id: 'corner-bl', bottom: 32, left: 32, borderLeft: "3px solid #8b6914", borderBottom: "3px solid #8b6914" },
    { id: 'corner-br', bottom: 32, right: 32, borderRight: "3px solid #8b6914", borderBottom: "3px solid #8b6914" },
  ];

  return (
    <>
      {corners.map(({ id, ...style }) => (
        <div
          key={id}
          style={{
            position: "absolute",
            width: 24,
            height: 24,
            display: "flex",
            ...style,
          }}
        />
      ))}
    </>
  );
}

export function GoldBars() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          width: 200,
          height: 4,
          background: "linear-gradient(90deg, transparent 0%, #d4a853 20%, #ffd700 50%, #d4a853 80%, transparent 100%)",
          borderRadius: 2,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          width: 200,
          height: 4,
          background: "linear-gradient(90deg, transparent 0%, #8b6914 20%, #d4a853 50%, #8b6914 80%, transparent 100%)",
          borderRadius: 2,
          display: "flex",
        }}
      />
    </>
  );
}
