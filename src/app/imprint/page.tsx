import type { Metadata } from "next";
import Link from "next/link";
import { Scroll, Mail, Globe, Shield, ArrowLeft } from "lucide-react";
import { IMPRINT } from "@/config/deployment.config";
import { SeasonalCorner, SeasonalDivider, SeasonalEmblem } from "@/presentation/components/seasonal";
import { ClassicAmbienceOnly } from "@/presentation/components/ui/ClassicAmbienceOnly";
import { THEME_SURFACE } from "@/presentation/config/theme-surface.config";
import { LEGAL_COPY } from "@/presentation/config/legal.config";

export const metadata: Metadata = {
  title: "Imprint",
  description: "Legal information and imprint for Wizard Party",
  robots: {
    index: true,
    follow: true,
  },
};

export default function ImprintPage() {
  return (
    <div className="min-h-screen overflow-auto">
      {/* Ambient particles (classic themes; seasonal themes use the global ambience) */}
      <ClassicAmbienceOnly>
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {[
            { id: 'p0', left: 8, top: 10, delay: 0, duration: 2 },
            { id: 'p1', left: 16, top: 28, delay: 0.3, duration: 2.2 },
            { id: 'p2', left: 24, top: 46, delay: 0.6, duration: 2.4 },
            { id: 'p3', left: 32, top: 64, delay: 0.9, duration: 2.6 },
            { id: 'p4', left: 40, top: 82, delay: 1.2, duration: 2.8 },
            { id: 'p5', left: 48, top: 10, delay: 1.5, duration: 3 },
            { id: 'p6', left: 56, top: 28, delay: 1.8, duration: 3.2 },
            { id: 'p7', left: 64, top: 46, delay: 2.1, duration: 3.4 },
            { id: 'p8', left: 72, top: 64, delay: 2.4, duration: 3.6 },
            { id: 'p9', left: 80, top: 82, delay: 2.7, duration: 3.8 },
            { id: 'p10', left: 88, top: 10, delay: 3.0, duration: 4 },
            { id: 'p11', left: 96, top: 28, delay: 3.3, duration: 4.2 },
          ].map((particle) => (
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
          className="inline-flex items-center gap-2 text-amber-400/70 hover:text-amber-300 transition-colors mb-8 group"
          style={{ fontFamily: "Georgia, serif" }}
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
                <Scroll className="w-6 h-6 text-amber-500/80" />
              </div>
              <div>
                <h1
                  className="text-2xl text-amber-200/90"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  Legal Notice
                </h1>
                <p
                  className="text-amber-600/60 text-sm"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  Information according to German law (§ 5 TMG)
                </p>
              </div>
            </div>

            {/* Header divider */}
            <SeasonalDivider className="mt-4" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Responsible Person */}
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
                className="text-lg text-amber-200/90 mb-4 flex items-center gap-2"
                style={{ fontFamily: "Georgia, serif" }}
              >
                <SeasonalEmblem size={14} className="opacity-70" />
                Responsible for Content
              </h2>
              <div
                className="text-amber-300/70 space-y-1"
                style={{ fontFamily: "Georgia, serif" }}
              >
                <p className="text-amber-200/90">{IMPRINT.name}</p>
                {IMPRINT.addressLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          </section>

          {/* Contact */}
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
                className="text-lg text-amber-200/90 mb-4 flex items-center gap-2"
                style={{ fontFamily: "Georgia, serif" }}
              >
                <SeasonalEmblem size={14} className="opacity-70" />
                Contact
              </h2>
              <div
                className="text-amber-300/70 space-y-3"
                style={{ fontFamily: "Georgia, serif" }}
              >
                {IMPRINT.email ? (
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-amber-600/60" />
                    <span className="text-amber-400/60">Email:</span>{" "}
                    <a href={`mailto:${IMPRINT.email}`} className="text-amber-400 hover:text-amber-300 transition-colors">
                      {IMPRINT.email}
                    </a>
                  </p>
                ) : null}
                {IMPRINT.website ? (
                  <p className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-amber-600/60" />
                    <span className="text-amber-400/60">Website:</span>{" "}
                    <a href={IMPRINT.website} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 transition-colors">
                      {IMPRINT.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          {/* Disclaimer */}
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
                className="text-lg text-amber-200/90 mb-4 flex items-center gap-2"
                style={{ fontFamily: "Georgia, serif" }}
              >
                <Shield className="w-4 h-4 text-amber-600/60" />
                Disclaimer
              </h2>

              <div
                className="space-y-6 text-amber-300/70 text-sm leading-relaxed"
                style={{ fontFamily: "Georgia, serif" }}
              >
                <div>
                  <h3 className="text-amber-200/90 mb-2">Liability for Content</h3>
                  <p>
                    The contents of these pages were created with the utmost care. However, I cannot
                    guarantee the accuracy, completeness, or timeliness of the content. As a service
                    provider, I am responsible for my own content on these pages in accordance with
                    general laws pursuant to § 7 para. 1 TMG.
                  </p>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/20" />
                  <span className="text-amber-700/40 text-xs">✦</span>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/20" />
                </div>

                <div>
                  <h3 className="text-amber-200/90 mb-2">Liability for Links</h3>
                  <p>
                    This website contains links to external third-party websites over whose content
                    I have no influence. Therefore, I cannot accept any liability for this external
                    content. The respective provider or operator of the linked pages is always
                    responsible for the content of those pages.
                  </p>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/20" />
                  <span className="text-amber-700/40 text-xs">✦</span>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/20" />
                </div>

                <div>
                  <h3 className="text-amber-200/90 mb-2">Copyright</h3>
                  <p>
                    {LEGAL_COPY.SOURCE_LICENSE} The source code is available at{" "}
                    <a href={LEGAL_COPY.SOURCE_URL} className="text-amber-400 hover:text-amber-300 transition-colors">
                      {LEGAL_COPY.SOURCE_URL.replace("https://", "")}
                    </a>
                    . Other content on these pages is subject to German copyright law.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Project Info */}
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
                className="text-lg text-amber-200/90 mb-4 flex items-center gap-2"
                style={{ fontFamily: "Georgia, serif" }}
              >
                <SeasonalEmblem size={14} className="opacity-70" />
                About Wizard Party
              </h2>
              <div
                className="text-amber-300/70 text-sm leading-relaxed space-y-3"
                style={{ fontFamily: "Georgia, serif" }}
              >
                <p>
                  Wizard Party is a free online multiplayer card game, developed as a private hobby
                  project. The game is operated without commercial intent and is available free of
                  charge to all players.
                </p>
                <p>{LEGAL_COPY.TRADEMARK_DISCLAIMER}</p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-amber-700/30">
          <div
            className="flex items-center justify-center gap-4 text-sm"
            style={{ fontFamily: "Georgia, serif" }}
          >
            <Link href="/privacy" className="text-amber-500/60 hover:text-amber-400 transition-colors">
              Privacy Policy
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
