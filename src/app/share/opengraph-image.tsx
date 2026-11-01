import { ImageResponse } from "next/og";
import { SITE_HOST } from "@/config/deployment.config";
import {
  TrophyIcon,
  PlayerCard,
  DecorativeBorders,
  CornerOrnaments,
  GoldBars,
} from "./og-components";

export const runtime = "edge";

export const alt = "Wizard Party - Game Results";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

interface ShareData {
  players: { name: string; score: number; perfect: number }[];
  rounds: number;
  code?: string;
}

function decodeShareData(encoded: string | null): ShareData | null {
  if (!encoded) return null;
  try {
    const decoded = atob(encoded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function Header({ winnerName, rounds }: { winnerName: string; rounds: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 8, width: "100%", minWidth: 0 }}>
        <div style={{ display: "flex", flexShrink: 0 }}>
          <TrophyIcon size={48} />
        </div>
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            fontFamily: "Georgia, serif",
            color: "#ffd700",
            margin: 0,
            minWidth: 0,
            maxWidth: 760,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span style={{ maxWidth: 760, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {winnerName}
          </span>
          <span style={{ fontSize: 40, color: "#d4a853" }}>Wins!</span>
        </div>
      </div>
      <p
        style={{
          fontSize: 24,
          color: "#8b7355",
          margin: 0,
          fontFamily: "Georgia, serif",
        }}
      >
        {rounds} Rounds of Wizard Party
      </p>
    </div>
  );
}

function Leaderboard({ players }: { players: { name: string; score: number; perfect: number; rank: number; id: string }[] }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: "100%",
        maxWidth: 700,
        background: "rgba(26, 21, 16, 0.8)",
        border: "2px solid #3d3020",
        borderRadius: 16,
        padding: 24,
      }}
    >
      {players.map((player) => (
        <PlayerCard key={player.id} player={player} />
      ))}
    </div>
  );
}

function RoomCode({ code }: { code: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginTop: 24,
        background: "rgba(212, 168, 83, 0.1)",
        border: "2px solid #3d3020",
        borderRadius: 12,
        padding: "12px 24px",
      }}
    >
      <span style={{ fontSize: 18, color: "#8b7355", fontFamily: "Georgia, serif" }}>
        Room Code:
      </span>
      <span
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "#ffd700",
          fontFamily: "monospace",
          letterSpacing: 4,
        }}
      >
        {code}
      </span>
    </div>
  );
}

function Footer() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 40,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span style={{ fontSize: 20, color: "#6b5a42", fontFamily: "Georgia, serif" }}>
        Play at
      </span>
      <span style={{ fontSize: 24, color: "#d4a853", fontFamily: "Georgia, serif", fontWeight: 600 }}>
        {SITE_HOST}
      </span>
    </div>
  );
}

export default async function Image(props: { searchParams: Promise<{ d?: string }> | { d?: string } }) {
  const params = props.searchParams instanceof Promise ? await props.searchParams : props.searchParams;
  const data = decodeShareData(params?.d || null);

  const players = data?.players || [
    { name: "Player 1", score: 100, perfect: 5 },
    { name: "Player 2", score: 80, perfect: 4 },
    { name: "Player 3", score: 60, perfect: 3 },
  ];
  const rounds = data?.rounds || 10;
  const code = data?.code;

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];
  const topPlayers = sortedPlayers.slice(0, 4).map((player, idx) => ({
    ...player,
    id: `rank-${idx + 1}-${player.name}`,
    rank: idx,
  }));

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(180deg, #1a1510 0%, #0d0b08 50%, #1a1510 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          padding: 40,
        }}
      >
        <DecorativeBorders />
        <CornerOrnaments />
        <Header winnerName={winner.name} rounds={rounds} />
        <Leaderboard players={topPlayers} />
        {code ? <RoomCode code={code} /> : null}
        <Footer />
        <GoldBars />
      </div>
    ),
    { ...size }
  );
}
