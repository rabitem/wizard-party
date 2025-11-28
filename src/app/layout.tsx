import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
    default: "Wizard Party",
    template: "%s | Wizard Party",
  },
  description: "A magical multiplayer party game. Cast spells, compete with friends, and become the ultimate wizard!",
  keywords: ["wizard", "party game", "multiplayer", "magic", "spells", "online game"],
  authors: [{ name: "Wizard Party Team" }],
  creator: "Wizard Party",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://wizard-party.vercel.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Wizard Party",
    title: "Wizard Party",
    description: "A magical multiplayer party game. Cast spells, compete with friends, and become the ultimate wizard!",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wizard Party",
    description: "A magical multiplayer party game. Cast spells, compete with friends, and become the ultimate wizard!",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
