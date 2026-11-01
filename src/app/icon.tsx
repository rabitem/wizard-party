import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <svg viewBox="0 0 64 64" width="32" height="32">
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd700" />
            <stop offset="50%" stopColor="#d4a853" />
            <stop offset="100%" stopColor="#8b6914" />
          </linearGradient>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a1510" />
            <stop offset="100%" stopColor="#0d0b08" />
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

        {/* Background */}
        <circle cx="32" cy="32" r="30" fill="url(#bgGrad)" />
        <circle cx="32" cy="32" r="29" fill="none" stroke="#d4a853" strokeWidth="2" />

        {/* Hat body */}
        <path d="M32 8 L46 50 L18 50 Z" fill="url(#hatGrad)" />
        <path d="M32 8 L38 50 L32 50 Z" fill="#4a3a90" opacity="0.4" />

        {/* Hat band */}
        <path d="M22 42 Q32 38 42 42 L44 46 Q32 42 20 46 Z" fill="url(#goldGrad)" />
        <path d="M22 42 Q32 38 42 42 L42.5 44 Q32 40 21.5 44 Z" fill="#ffd700" />

        {/* Hat brim */}
        <ellipse cx="32" cy="50" rx="20" ry="5" fill="#2a2060" />
        <ellipse cx="32" cy="50" rx="20" ry="5" fill="none" stroke="#d4a853" strokeWidth="1" />

        {/* Star */}
        <polygon
          points="32,16 34,22 40,22 35,26 37,32 32,28 27,32 29,26 24,22 30,22"
          fill="url(#starGlow)"
        />

        {/* Decorative dots */}
        <circle cx="12" cy="16" r="2" fill="#d4a853" />
        <circle cx="52" cy="16" r="1.5" fill="#d4a853" />
      </svg>
    ),
    { ...size }
  );
}
