import type { Metadata } from "next";
import { ogImageQuery } from "../_og/og-realm";
import { ShareClient } from "./share-client";

type Props = {
  searchParams: Promise<{ d?: string; realm?: string }>;
};

/** The results link's preview shows this game's results in the sharer's realm: the image route gets the same `d` and `realm`. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { d, realm } = await searchParams;
  const image = `/share/og${ogImageQuery({ d }, realm)}`;
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
