import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/styles/rpg-awesome.css";
import { SITE_URL } from "@/config/deployment.config";
import { CookieConsent } from "@/presentation/components/CookieConsent";
import { ConsentAwareAnalytics } from "@/presentation/components/ConsentAwareAnalytics";
import { ThemeProvider } from "@/presentation/components/ThemeProvider";
import { SeasonalAmbience } from "@/presentation/components/seasonal";
import { AccountProvider } from "@/presentation/providers/AccountProvider";
import { GameProvider } from "@/presentation/providers/GameProvider";
import { SocialProvider } from "@/presentation/providers/SocialProvider";
import { SocialOverlays } from "@/presentation/components/friends";
import { NewVersionBanner } from "@/presentation/components/version";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Wizard Party - Free Online Multiplayer Card Game",
    template: "%s | Wizard Party",
  },
  description:
    "Play the Wizard card game free online at a 3D table. Bid your tricks, then hit them exactly. Three to six players, friends or bots, eleven themed realms. No download, no account needed.",
  keywords: [
    "wizard card game",
    "online card game",
    "multiplayer card game",
    "trick-taking game",
    "party game",
    "free online game",
    "wizard party",
    "browser game",
    "card game with friends",
    "3d card game",
    "wizard card game rules",
  ],
  creator: "Wizard Party",
  publisher: "Wizard Party",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Wizard Party",
    title: "Wizard Party - Free Online Multiplayer Card Game",
    description:
      "Bid your tricks, then hit them exactly. The Wizard card game, free in your browser at a 3D table, with friends or bots.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wizard Party - Free Online Multiplayer Card Game",
    description:
      "Bid your tricks, then hit them exactly. The Wizard card game, free in your browser at a 3D table, with friends or bots.",
  },
  // The favicon and home-screen icon carry the Wizard Party mark (src/app/icon.tsx, apple-icon.tsx).
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.svg",
    apple: "/apple-icon",
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "games",
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Wizard Party",
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.png`,
    description:
      "Wizard Party, an unofficial fan version of the Wizard trick-taking card game, free to play online at a 3D table.",
    sameAs: [],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Wizard Party",
    description:
      "The Wizard trick-taking card game at a 3D table: bid your tricks, then hit them exactly. Three to six players, friends or bots.",
    url: SITE_URL,
    image: `${SITE_URL}/opengraph-image`,
    applicationCategory: "Game",
    applicationSubCategory: "Card Game",
    operatingSystem: "All",
    browserRequirements: "Requires JavaScript. Requires WebGL.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Wizard Party",
    description:
      "Play Wizard Party - a free online multiplayer trick-taking card game. Predict your tricks, compete with 3-6 players, and become the ultimate wizard!",
    url: SITE_URL,
    gamePlatform: ["Web Browser"],
    genre: ["Card Game", "Strategy Game", "Party Game"],
    playMode: "MultiPlayer",
    numberOfPlayers: {
      "@type": "QuantitativeValue",
      minValue: 3,
      maxValue: 6,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    author: {
      "@type": "Organization",
      name: "Wizard Party",
      url: SITE_URL,
    },
  },
];

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1a1510",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* JSON-LD Structured Data */}
        {jsonLd.map((schema) => (
          <script
            key={schema["@type"]}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          {/* Themed backdrop + seasonal particles, fixed behind all content (z-index -1) */}
          <SeasonalAmbience />
          <AccountProvider>
            <GameProvider>
              <SocialProvider>
                {children}
                <SocialOverlays />
              </SocialProvider>
            </GameProvider>
          </AccountProvider>
          <NewVersionBanner />
          <CookieConsent />
          <ConsentAwareAnalytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
