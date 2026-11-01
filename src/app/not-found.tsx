import type { Metadata } from "next";
import Link from "next/link";
import { Home } from "lucide-react";
import { ErrorPageShell } from "@/presentation/components/error-pages";
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you're looking for doesn't exist. Return to Wizard Party and start playing!",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <ErrorPageShell kind="not-found" code="404">
      <Link
        href="/"
        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded border-2 border-amber-600/50 text-amber-100 transition-all hover:border-amber-500/60"
        style={{
          background: THEME_SURFACE.ACTIVE_BG,
          fontFamily: "Georgia, serif",
          boxShadow: "0 0 20px var(--glow)",
        }}
      >
        <Home className="w-4 h-4" />
        Return to the Tavern
      </Link>
    </ErrorPageShell>
  );
}
