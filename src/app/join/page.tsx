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
      "You've been invited to play Wizard Party! Join the magical multiplayer trick-taking card game. Predict your tricks, compete with friends, and become the ultimate wizard.",
    openGraph: {
      title: "Join Wizard Party - Free Online Multiplayer Card Game",
      description:
        "You've been invited to play Wizard Party! Join the magical multiplayer trick-taking card game.",
      type: "website",
      images: [`/join/og${roomParam}`],
    },
    twitter: {
      card: "summary_large_image",
      title: "Join Wizard Party - Free Online Multiplayer Card Game",
      description:
        "You've been invited to play Wizard Party! Join the magical multiplayer trick-taking card game.",
      images: [`/join/og${roomParam}`],
    },
  };
}

export default async function JoinPage({ searchParams }: Props) {
  const params = await searchParams;
  const roomCode = params?.room || null;

  return <JoinClient roomCode={roomCode} />;
}
