import type { Metadata } from "next";
import { LobbyClient } from "./lobby-client";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  return {
    title: `Lobby ${slug} - Wizard Party`,
    description:
      "Join the magical multiplayer trick-taking card game. Predict your tricks, compete with friends, and become the ultimate wizard.",
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title: `Join Lobby - Wizard Party`,
      description:
        "You've been invited to play Wizard Party! Join the magical multiplayer trick-taking card game.",
      type: "website",
      images: [`/join/og?room=${slug}`],
    },
    twitter: {
      card: "summary_large_image",
      title: `Join Lobby - Wizard Party`,
      description:
        "You've been invited to play Wizard Party! Join the magical multiplayer trick-taking card game.",
      images: [`/join/og?room=${slug}`],
    },
  };
}

export default async function LobbyPage({ params }: Props) {
  const { slug } = await params;

  return <LobbyClient slug={slug} />;
}
