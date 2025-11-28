import { ImageResponse } from "next/og";

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
          background: "linear-gradient(135deg, #1e1b4b 0%, #09090b 50%, #1e1b4b 100%)",
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
        {/* Background stars/sparkles */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
          }}
        >
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: `${8 + (i % 3) * 4}px`,
                height: `${8 + (i % 3) * 4}px`,
                borderRadius: "50%",
                background: i % 2 === 0 ? "#fef08a" : "#c4b5fd",
                opacity: 0.3 + (i % 5) * 0.1,
                top: `${(i * 47) % 100}%`,
                left: `${(i * 73) % 100}%`,
              }}
            />
          ))}
        </div>

        {/* Wizard Hat SVG */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 30,
          }}
        >
          <svg
            width="180"
            height="180"
            viewBox="0 0 64 64"
            style={{ filter: "drop-shadow(0 8px 24px rgba(139, 92, 246, 0.5))" }}
          >
            <defs>
              <linearGradient id="hatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6d28d9" />
              </linearGradient>
              <linearGradient id="hatShadow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#4c1d95" />
              </linearGradient>
              <linearGradient id="brimGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#6d28d9" />
              </linearGradient>
              <linearGradient id="starGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
            <path d="M32 6 L48 52 L16 52 Z" fill="url(#hatGrad)" />
            <path d="M32 6 L40 52 L32 52 L24 52 Z" fill="url(#hatShadow)" opacity="0.3" />
            <path d="M20 44 Q32 40 44 44 L46 48 Q32 44 18 48 Z" fill="#fbbf24" />
            <path d="M20 44 Q32 40 44 44 L44.5 46 Q32 42 19.5 46 Z" fill="#fef08a" />
            <ellipse cx="32" cy="52" rx="22" ry="6" fill="url(#brimGrad)" />
            <ellipse cx="32" cy="51" rx="20" ry="4" fill="#a78bfa" opacity="0.4" />
            <polygon
              points="32,14 34.5,22 43,22 36.5,27 39,35 32,30 25,35 27.5,27 21,22 29.5,22"
              fill="url(#starGlow)"
            />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <h1
            style={{
              fontSize: 72,
              fontWeight: 800,
              background: "linear-gradient(90deg, #c084fc 0%, #fbbf24 50%, #c084fc 100%)",
              backgroundClip: "text",
              color: "transparent",
              margin: 0,
              letterSpacing: "-2px",
              textShadow: "0 4px 24px rgba(139, 92, 246, 0.4)",
            }}
          >
            Wizard Party
          </h1>

          <p
            style={{
              fontSize: 28,
              color: "#a78bfa",
              margin: 0,
              fontWeight: 500,
              letterSpacing: "0.5px",
            }}
          >
            Free Online Multiplayer Card Game
          </p>

          <div
            style={{
              display: "flex",
              gap: 24,
              marginTop: 24,
            }}
          >
            {["Trick-Taking", "2-6 Players", "No Download"].map((text) => (
              <div
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(139, 92, 246, 0.2)",
                  border: "1px solid rgba(167, 139, 250, 0.3)",
                  borderRadius: 999,
                  padding: "8px 20px",
                }}
              >
                <span style={{ color: "#fbbf24", fontSize: 18 }}>★</span>
                <span style={{ color: "#e9d5ff", fontSize: 18 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "#6d28d9", fontSize: 20 }}>
            {(process.env.NEXT_PUBLIC_APP_URL || "https://wizard-party.vercel.app").replace(/^https?:\/\//, "")}
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
