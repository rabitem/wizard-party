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
    "Play Wizard Party free online! A magical multiplayer trick-taking card game. Predict your tricks, cast spells, compete with friends, and become the ultimate wizard. No download required.",
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
  ],
  authors: [{ name: "Wizard Party Team" }],
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
      "Play Wizard Party free online! A magical multiplayer trick-taking card game. Predict your tricks, compete with friends, and become the ultimate wizard.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wizard Party - Free Online Multiplayer Card Game",
    description:
      "Play Wizard Party free online! A magical multiplayer trick-taking card game. Predict your tricks, compete with friends!",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
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
    logo: `${SITE_URL}/opengraph-image`,
    description:
      "Free online multiplayer card game platform. Play Wizard Party - a magical trick-taking card game with friends.",
    sameAs: [],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Wizard Party",
    description:
      "A magical multiplayer trick-taking card game. Predict your tricks, compete with friends, and become the ultimate wizard.",
    url: SITE_URL,
    applicationCategory: "Game",
    applicationSubCategory: "Card Game",
    operatingSystem: "All",
    browserRequirements: "Requires JavaScript. Requires WebGL.",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "1",
      bestRating: "5",
      worstRating: "1",
    },
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
