import { ImageResponse } from "next/og";
import { SITE_HOST } from "@/config/deployment.config";

export const runtime = "edge";

export const alt = "Wizard Party - Free Online Multiplayer Card Game";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
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
        {/* Subtle border */}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            right: 8,
            bottom: 8,
            border: "2px solid #3d3020",
            borderRadius: 12,
            display: "flex",
          }}
        />

        {/* Corner ornaments */}
        <div style={{ position: "absolute", top: 16, left: 16, width: 20, height: 20, borderLeft: "2px solid #d4a853", borderTop: "2px solid #d4a853", display: "flex" }} />
        <div style={{ position: "absolute", top: 16, right: 16, width: 20, height: 20, borderRight: "2px solid #d4a853", borderTop: "2px solid #d4a853", display: "flex" }} />
        <div style={{ position: "absolute", bottom: 16, left: 16, width: 20, height: 20, borderLeft: "2px solid #8b6914", borderBottom: "2px solid #8b6914", display: "flex" }} />
        <div style={{ position: "absolute", bottom: 16, right: 16, width: 20, height: 20, borderRight: "2px solid #8b6914", borderBottom: "2px solid #8b6914", display: "flex" }} />

        {/* Background sparkles */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex" }}>
          {[
            { id: 'sparkle-0', top: 0, left: 0 },
            { id: 'sparkle-1', top: 53, left: 71 },
            { id: 'sparkle-2', top: 6, left: 42 },
            { id: 'sparkle-3', top: 59, left: 13 },
            { id: 'sparkle-4', top: 12, left: 84 },
            { id: 'sparkle-5', top: 65, left: 55 },
            { id: 'sparkle-6', top: 18, left: 26 },
            { id: 'sparkle-7', top: 71, left: 97 },
            { id: 'sparkle-8', top: 24, left: 68 },
            { id: 'sparkle-9', top: 77, left: 39 },
          ].map((sparkle, i) => (
            <div
              key={sparkle.id}
              style={{
                position: "absolute",
                width: `${6 + (i % 3) * 3}px`,
                height: `${6 + (i % 3) * 3}px`,
                borderRadius: "50%",
                background: i % 2 === 0 ? "#d4a853" : "#8b6914",
                opacity: 0.12 + (i % 4) * 0.06,
                top: `${sparkle.top}%`,
                left: `${sparkle.left}%`,
              }}
            />
          ))}
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 56,
            padding: "0 80px",
          }}
        >
          {/* Left side - Wizard Hat */}
          <svg
            width="240"
            height="240"
            viewBox="0 0 64 64"
            style={{ filter: "drop-shadow(0 8px 40px rgba(212, 168, 83, 0.5))" }}
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

          {/* Right side - Text */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 16,
            }}
          >
            {/* Title */}
            <h1
              style={{
                fontSize: 96,
                fontWeight: 700,
                fontFamily: "Georgia, serif",
                background: "linear-gradient(180deg, #ffd700 0%, #d4a853 50%, #8b6914 100%)",
                backgroundClip: "text",
                color: "transparent",
                margin: 0,
                letterSpacing: "-2px",
                lineHeight: 1,
              }}
            >
              Wizard Party
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: 32,
                color: "#c9b896",
                margin: 0,
                fontFamily: "Georgia, serif",
                marginBottom: 16,
              }}
            >
              Free Online Multiplayer Card Game
            </p>

            {/* Feature badges */}
            <div
              style={{
                display: "flex",
                gap: 16,
              }}
            >
              {["Trick-Taking", "2-6 Players", "No Download"].map((text) => (
                <div
                  key={text}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(26, 21, 16, 0.9)",
                    border: "2px solid #d4a853",
                    borderRadius: 8,
                    padding: "10px 20px",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffd700">
                    <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
                  </svg>
                  <span style={{ color: "#fef3c7", fontSize: 18, fontFamily: "Georgia, serif" }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
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

        {/* Decorative top gold bar */}
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

        {/* Decorative bottom gold bar */}
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
      </div>
    ),
    {
      ...size,
    }
  );
}
