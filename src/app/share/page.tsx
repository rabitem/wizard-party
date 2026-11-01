import type { Metadata } from "next";
import { ShareClient } from "./share-client";

type Props = {
  searchParams: Promise<{ d?: string }>;
};

/** The results link's preview shows this game's results: the image route gets the same `d`. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { d } = await searchParams;
  const image = d ? `/share/og?d=${encodeURIComponent(d)}` : "/share/og";
  const title = "Wizard Party - Game Results";
  const description = "See who called their tricks best, then take a seat at the next table. Free in your browser.";
  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function SharePage() {
  return <ShareClient />;
}
