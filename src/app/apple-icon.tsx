import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1e1b4b 0%, #09090b 100%)",
          borderRadius: 40,
        }}
      >
        <svg viewBox="0 0 64 64" width="140" height="140">
          <defs>
            <linearGradient id="hatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#6d28d9" />
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
          <path d="M20 44 Q32 40 44 44 L46 48 Q32 44 18 48 Z" fill="#fbbf24" />
          <path d="M20 44 Q32 40 44 44 L44.5 46 Q32 42 19.5 46 Z" fill="#fef08a" />
          <ellipse cx="32" cy="52" rx="22" ry="6" fill="url(#brimGrad)" />
          <polygon
            points="32,14 34.5,22 43,22 36.5,27 39,35 32,30 25,35 27.5,27 21,22 29.5,22"
            fill="url(#starGlow)"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
