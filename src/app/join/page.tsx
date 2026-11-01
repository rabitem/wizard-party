import type { Metadata } from "next";
import { ogImageQuery } from "../_og/og-realm";
import { JoinClient } from "./join-client";

type Props = {
  searchParams: Promise<{ room?: string; realm?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const image = `/join/og${ogImageQuery({ room: params?.room }, params?.realm)}`;

  return {
    title: "Join Wizard Party - Free Online Multiplayer Card Game",
    description:
      "You're invited to a table at Wizard Party. Bid your tricks, then hit them exactly: the Wizard card game, free in your browser.",
    openGraph: {
      title: "Join Wizard Party - Free Online Multiplayer Card Game",
      description:
        "You're invited to a table. Tap to take your seat: the Wizard card game, free in your browser.",
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: "Join Wizard Party - Free Online Multiplayer Card Game",
      description:
        "You're invited to a table. Tap to take your seat: the Wizard card game, free in your browser.",
      images: [image],
    },
  };
}

export default async function JoinPage({ searchParams }: Props) {
  const params = await searchParams;
  const roomCode = params?.room || null;

  return <JoinClient roomCode={roomCode} />;
}
