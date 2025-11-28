import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CookieConsent } from "@/presentation/components/CookieConsent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://wizard-party.vercel.app";

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
  metadataBase: new URL(BASE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
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
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
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
    "@type": "WebApplication",
    name: "Wizard Party",
    description:
      "A magical multiplayer trick-taking card game. Predict your tricks, compete with friends, and become the ultimate wizard.",
    url: BASE_URL,
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
      "Play Wizard Party - a free online multiplayer trick-taking card game. Predict your tricks, compete with 2-6 players, and become the ultimate wizard!",
    url: BASE_URL,
    gamePlatform: ["Web Browser"],
    genre: ["Card Game", "Strategy Game", "Party Game"],
    playMode: "MultiPlayer",
    numberOfPlayers: {
      "@type": "QuantitativeValue",
      minValue: 2,
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
      url: BASE_URL,
    },
  },
];

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to external resources for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        {/* JSON-LD Structured Data */}
        {jsonLd.map((schema, index) => (
          <script
            key={index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
