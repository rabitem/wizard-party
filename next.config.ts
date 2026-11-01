import type { NextConfig } from "next";
import { missingProductionSettings } from "./src/config/deployment-requirements";

// The code names no site, worker or operator; a production deployment that forgot its own would
// go live with placeholders and a localhost game server. Fail the build and keep the old one live.
if (process.env.VERCEL_ENV === "production") {
  const missing = missingProductionSettings(process.env);
  if (missing.length > 0) {
    throw new Error(
      `Production build without its deployment settings. Set ${missing.join(", ")} ` +
        "(docs/operations/configuration.md)."
    );
  }
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  turbopack: {},
  transpilePackages: ["three", "postprocessing", "@react-three/postprocessing"],
  webpack: (config) => {
    // Enable async WebAssembly for Rapier physics
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Ignore source map warnings from WASM modules (Rapier)
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /node_modules\/@dimforge/ },
      /Failed to parse source map/,
      /Invalid URL/,
    ];

    return config;
  },
  // Disable browser source maps in production to avoid WASM source map errors
  productionBrowserSourceMaps: false,
  // Invite and friend request emails render an avatar card with the icon font, read from disk.
  outputFileTracingIncludes: {
    '/api/social/invites': ['./public/fonts/rpgawesome-webfont.ttf'],
    '/api/social/friends': ['./public/fonts/rpgawesome-webfont.ttf'],
    // Link previews read their serif and the room captures from disk (src/app/_og/og-kit.tsx).
    '/opengraph-image': ['./assets/og/**'],
    '/twitter-image': ['./assets/og/**'],
    '/share/og': ['./assets/og/**'],
    '/join/og': ['./assets/og/**'],
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/favicon.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
