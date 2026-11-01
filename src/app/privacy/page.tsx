import type { Metadata } from "next";
import Link from "next/link";
import { Lock, ArrowLeft } from "lucide-react";
import { SeasonalCorner, SeasonalDivider } from "@/presentation/components/seasonal";
import { ClassicAmbienceOnly } from "@/presentation/components/ui/ClassicAmbienceOnly";
import { THEME_SURFACE } from "@/presentation/config/theme-surface.config";
import { privacySections } from "./privacy-sections";
import { ambientParticles } from "./ambient-particles";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Wizard Party - Information about data processing",
  robots: {
    index: true,
    follow: true,
  },
};

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function Section({ icon, title, children }: SectionProps) {
  return (
    <section className="relative">
      <div className="absolute -inset-2 bg-amber-900/10 rounded-lg blur-xl" />
      <div
        className="relative rounded-lg border-2 border-amber-700/40 overflow-hidden p-6"
        style={{
          background: THEME_SURFACE.PANEL_BG,
          boxShadow: THEME_SURFACE.PANEL_SHADOW,
        }}
      >
        <h2
          className="text-lg text-amber-200/90 mb-4 flex items-center gap-2 font-serif"
        >
          {icon}
          {title}
        </h2>
        <div
          className="space-y-4 text-amber-300/70 text-sm leading-relaxed font-serif"
        >
          {children}
        </div>
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen overflow-auto">
      {/* Ambient particles (classic themes; seasonal themes use the global ambience) */}
      <ClassicAmbienceOnly>
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {ambientParticles.map((particle) => (
            <div
              key={particle.id}
              className="absolute w-1 h-1 bg-amber-500/30 rounded-full animate-pulse"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
              }}
            />
          ))}
        </div>
      </ClassicAmbienceOnly>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-amber-400/70 hover:text-amber-300 transition-colors mb-8 group font-serif"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Return to the Tavern
        </Link>

        {/* Header */}
        <div className="relative mb-12">
          <div className="absolute -inset-4 bg-amber-900/20 rounded-lg blur-2xl" />
          <div
            className="relative rounded-lg border-2 border-amber-700/40 overflow-hidden px-8 py-6"
            style={{
              background: THEME_SURFACE.PANEL_BG,
              boxShadow: THEME_SURFACE.PANEL_SHADOW_GLOW,
            }}
          >
            {/* Corner flourishes */}
            <SeasonalCorner position="top-left" size={28} />
            <SeasonalCorner position="top-right" size={28} />
            <SeasonalCorner position="bottom-left" size={28} />
            <SeasonalCorner position="bottom-right" size={28} />

            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded border-2 border-amber-700/50 flex items-center justify-center"
                style={{ background: THEME_SURFACE.TILE_BG }}
              >
                <Lock className="w-6 h-6 text-amber-500/80" />
              </div>
              <div>
                <h1
                  className="text-2xl text-amber-200/90 font-serif"
                >
                  Privacy Policy
                </h1>
                <p
                  className="text-amber-600/60 text-sm font-serif"
                >
                  Last updated: November 2026
                </p>
              </div>
            </div>

            {/* Header divider */}
            <SeasonalDivider className="mt-4" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {privacySections.map((section) => (
            <Section key={section.title} icon={section.icon} title={section.title}>
              {section.content}
            </Section>
          ))}
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-amber-700/30">
          <div
            className="flex items-center justify-center gap-4 text-sm font-serif"
          >
            <Link href="/imprint" className="text-amber-500/60 hover:text-amber-400 transition-colors">
              Imprint
            </Link>
            <span className="text-amber-700/40">✦</span>
            <Link href="/" className="text-amber-500/60 hover:text-amber-400 transition-colors">
              Back to Game
            </Link>
          </div>

          {/* Bottom flourish */}
          <SeasonalDivider className="mt-6 mx-auto max-w-[12rem]" />
        </div>
      </div>
    </div>
  );
}
