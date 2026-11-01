"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, Home } from "lucide-react";
import { clientTelemetry } from "@/lib/client-telemetry";
import { ErrorPageShell } from "@/presentation/components/error-pages";
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const SERIF = { fontFamily: "Georgia, serif" } as const;

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
    clientTelemetry.reportError({ kind: "boundary", error, digest: error.digest });
  }, [error]);

  return (
    <ErrorPageShell
      kind="error"
      footnote={error.digest ? (
        <p className="mt-6 text-red-400/50 text-xs" style={SERIF}>
          Curse ID: {error.digest}
        </p>
      ) : null}
    >
      <button
        onClick={reset}
        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded border-2 border-amber-600/50 text-amber-100 transition-all hover:border-amber-500/60 cursor-pointer"
        style={{
          ...SERIF,
          background: THEME_SURFACE.ACTIVE_BG,
          boxShadow: "0 0 20px var(--glow)",
        }}
      >
        <RotateCcw className="w-4 h-4" />
        Retry the Spell
      </button>
      <Link
        href="/"
        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded border text-amber-200/80 transition-all hover:text-amber-100"
        style={{ ...SERIF, background: "var(--surface)", borderColor: "var(--surface-border)" }}
      >
        <Home className="w-4 h-4" />
        Return to the Tavern
      </Link>
    </ErrorPageShell>
  );
}
