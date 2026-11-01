"use client";

import { useEffect, useSyncExternalStore } from "react";
import { clientTelemetry } from "@/lib/client-telemetry";
import { safeLocalStorage } from "@/lib/storage";
import { CONSTANTS } from "@/presentation/config/constants";
import "./globals.css";

/**
 * Last-resort boundary: replaces the root layout, so no ThemeProvider runs here. It imports the
 * global CSS itself, reads the saved theme straight from safe storage (no settings module, so a
 * broken settings import cannot take the error page down too) and applies the `.theme-<id>` class
 * to its own <html>. Every themed value carries the classic Dark color as a CSS fallback, so the
 * page still renders dark if the stylesheet or storage is unavailable.
 */
interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const SERIF = "Georgia, serif";
const DEFAULT_THEME_CLASS = "theme-dark";
const THEME_ID_PATTERN = /^[a-z][a-z-]{0,31}$/;

function readStoredThemeClass(): string {
  const settings = safeLocalStorage.readJson(CONSTANTS.STORAGE_KEYS.SETTINGS);
  const theme: unknown = settings && typeof settings === "object" ? (settings as { theme?: unknown }).theme : null;
  return typeof theme === "string" && THEME_ID_PATTERN.test(theme) ? `theme-${theme}` : DEFAULT_THEME_CLASS;
}

function subscribeToStorage(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

const getServerThemeClass = () => DEFAULT_THEME_CLASS;

/** Theme-variable reference with the classic Dark value as fallback. */
const themed = (variable: string, fallback: string) => `var(${variable}, ${fallback})`;
const AMBER_100 = themed("--color-amber-100", "#fef3c7");
const AMBER_200 = themed("--color-amber-200", "#fde68a");
const AMBER_600 = themed("--color-amber-600", "#d97706");
const AMBER_700 = themed("--color-amber-700", "#b45309");
const AMBER_800 = themed("--color-amber-800", "#92400e");
const fade = (color: string, share: number) => `color-mix(in srgb, ${color} ${share}%, transparent)`;

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
    clientTelemetry.reportError({ kind: "boundary", error, digest: error.digest });
  }, [error]);

  const themeClass = useSyncExternalStore(subscribeToStorage, readStoredThemeClass, getServerThemeClass);

  return (
    <html lang="en" className={themeClass}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          background: themed("--page-bg", "radial-gradient(ellipse at top, #1a1610 0%, #0f0d0a 50%, #080706 100%)"),
          color: AMBER_200,
          fontFamily: SERIF,
        }}
      >
        <main
          style={{
            maxWidth: 420,
            textAlign: "center",
            padding: "40px 32px",
            borderRadius: 8,
            background: themed("--surface", "rgba(26, 21, 16, 0.92)"),
            border: `2px solid ${themed("--surface-border", "rgba(180, 83, 9, 0.3)")}`,
            boxShadow: `0 0 30px ${themed("--glow", "rgba(212, 168, 83, 0.35)")}`,
          }}
        >
          <h1 style={{ fontSize: 24, margin: "0 0 12px", color: "#fecaca" }}>The Whole Tavern Shook</h1>
          <p style={{ margin: "0 0 28px", color: fade(AMBER_200, 70) }}>
            A spell went so wrong that the realm itself needs a moment. Try again, or reload the page.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "12px 24px",
              borderRadius: 4,
              border: `2px solid ${fade(AMBER_600, 50)}`,
              background: `linear-gradient(180deg, ${fade(AMBER_700, 40)} 0%, ${fade(AMBER_800, 30)} 100%)`,
              color: AMBER_100,
              fontFamily: SERIF,
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Retry the Spell
          </button>
          {error.digest ? (
            <p style={{ marginTop: 24, fontSize: 12, color: "rgba(248, 113, 113, 0.5)" }}>Curse ID: {error.digest}</p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
