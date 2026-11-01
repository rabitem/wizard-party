import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { SITE_HOST } from "@/config/deployment.config";
import {
  BorderAndOrnaments,
  BackgroundSparkles,
} from "./og-components";

export const runtime = "edge";

function WizardHatIcon() {
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 64 64"
      style={{ filter: "drop-shadow(0 8px 32px rgba(212, 168, 83, 0.5))" }}
    >
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffd700" />
          <stop offset="50%" stopColor="#d4a853" />
          <stop offset="100%" stopColor="#8b6914" />
        </linearGradient>
        <linearGradient id="hatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3d3080" />
          <stop offset="50%" stopColor="#2a2060" />
          <stop offset="100%" stopColor="#1a1040" />
        </linearGradient>
        <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd700" />
          <stop offset="100%" stopColor="#d4a853" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="#1a1510" />
      <circle cx="32" cy="32" r="29" fill="none" stroke="#d4a853" strokeWidth="2" />
      <path d="M32 8 L46 50 L18 50 Z" fill="url(#hatGrad)" />
      <path d="M32 8 L38 50 L32 50 Z" fill="#4a3a90" opacity="0.4" />
      <path d="M22 42 Q32 38 42 42 L44 46 Q32 42 20 46 Z" fill="url(#goldGrad)" />
      <path d="M22 42 Q32 38 42 42 L42.5 44 Q32 40 21.5 44 Z" fill="#ffd700" />
      <ellipse cx="32" cy="50" rx="20" ry="5" fill="#2a2060" />
      <ellipse cx="32" cy="50" rx="20" ry="5" fill="none" stroke="#d4a853" strokeWidth="1" />
      <polygon
        points="32,16 34,22 40,22 35,26 37,32 32,28 27,32 29,26 24,22 30,22"
        fill="url(#starGlow)"
      />
    </svg>
  );
}

function JoinHeader() {
  return (
    <>
      <h1
        style={{
          fontSize: 72,
          fontWeight: 700,
          fontFamily: "Georgia, serif",
          background: "linear-gradient(180deg, #ffd700 0%, #d4a853 50%, #8b6914 100%)",
          backgroundClip: "text",
          color: "transparent",
          margin: 0,
          letterSpacing: "-1px",
          lineHeight: 1,
        }}
      >
        Join the Game!
      </h1>
      <p
        style={{
          fontSize: 26,
          color: "#c9b896",
          margin: 0,
          fontFamily: "Georgia, serif",
          marginBottom: 24,
        }}
      >
        A wizard awaits your arrival
      </p>
    </>
  );
}

function RoomCodeBox({ roomCode }: { roomCode: string }) {
  const chars = roomCode.toUpperCase().split("").map((char, idx) => ({
    id: `char-${idx}-${char}`,
    char,
  }));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          fontSize: 14,
          color: "#6b5a42",
          fontFamily: "Georgia, serif",
          textTransform: "uppercase",
          letterSpacing: 3,
          display: "flex",
        }}
      >
        Room Code
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {chars.map((item) => (
          <div
            key={item.id}
            style={{
              width: 72,
              height: 88,
              background: "linear-gradient(180deg, rgba(26, 21, 16, 0.95) 0%, rgba(13, 11, 8, 0.95) 100%)",
              border: "2px solid #d4a853",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212, 168, 83, 0.2)",
            }}
          >
            <span
              style={{
                fontSize: 56,
                fontWeight: 700,
                color: "#ffd700",
                fontFamily: "Georgia, serif",
                textShadow: "0 0 24px rgba(255, 215, 0, 0.6)",
              }}
            >
              {item.char}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DecorativeGoldBars() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 160,
          height: 3,
          background: "linear-gradient(90deg, transparent 0%, #d4a853 20%, #ffd700 50%, #d4a853 80%, transparent 100%)",
          borderRadius: 2,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 160,
          height: 3,
          background: "linear-gradient(90deg, transparent 0%, #8b6914 20%, #d4a853 50%, #8b6914 80%, transparent 100%)",
          borderRadius: 2,
          display: "flex",
        }}
      />
    </>
  );
}

function JoinFooter() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ fontSize: 18, color: "#6b5a42", fontFamily: "Georgia, serif" }}>
        {SITE_HOST}
      </span>
    </div>
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const roomCode = (searchParams.get("room") || "????").slice(0, 8);

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
        }}
      >
        <BorderAndOrnaments />
        <BackgroundSparkles />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 60,
            padding: "0 60px",
          }}
        >
          <WizardHatIcon />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <JoinHeader />
            <RoomCodeBox roomCode={roomCode} />
          </div>
        </div>

        <JoinFooter />
        <DecorativeGoldBars />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
