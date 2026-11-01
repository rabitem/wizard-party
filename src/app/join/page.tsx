import type { Metadata } from "next";
import { JoinClient } from "./join-client";

type Props = {
  searchParams: Promise<{ room?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const room = params?.room || "";
  const roomParam = room ? `?room=${room}` : "";

  return {
    title: "Join Wizard Party - Free Online Multiplayer Card Game",
    description:
      "You're invited to a table at Wizard Party. Bid your tricks, then hit them exactly: the Wizard card game, free in your browser.",
    openGraph: {
      title: "Join Wizard Party - Free Online Multiplayer Card Game",
      description:
        "You're invited to a table. Tap to take your seat: the Wizard card game, free in your browser.",
      type: "website",
      images: [`/join/og${roomParam}`],
    },
    twitter: {
      card: "summary_large_image",
      title: "Join Wizard Party - Free Online Multiplayer Card Game",
      description:
        "You're invited to a table. Tap to take your seat: the Wizard card game, free in your browser.",
      images: [`/join/og${roomParam}`],
    },
  };
}

export default async function JoinPage({ searchParams }: Props) {
  const params = await searchParams;
  const roomCode = params?.room || null;

  return <JoinClient roomCode={roomCode} />;
}
