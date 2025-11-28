import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum und rechtliche Angaben für Wizard Party",
  robots: {
    index: true,
    follow: true,
  },
};

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e1b4b] via-[#09090b] to-[#1e1b4b] overflow-auto">
      {/* Decorative sparkles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-300 rounded-full opacity-20 animate-pulse" />
        <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-purple-300 rounded-full opacity-30 animate-pulse" style={{ animationDelay: "0.5s" }} />
        <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-yellow-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-2/3 right-1/4 w-1.5 h-1.5 bg-amber-300 rounded-full opacity-25 animate-pulse" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-amber-400/70 hover:text-amber-300 transition-colors mb-8 group"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Zurück zum Spiel
        </Link>

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-600/20 border border-purple-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-light text-amber-100 tracking-wide">Impressum</h1>
          </div>
          <p className="text-amber-200/50 text-sm">Angaben gemäß § 5 TMG</p>
        </div>

        {/* Content */}
        <div className="space-y-10">
          {/* Responsible Person */}
          <section className="bg-[#12121f]/50 rounded-2xl border border-amber-500/10 p-6">
            <h2 className="text-lg font-medium text-amber-100 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              Verantwortlich für den Inhalt
            </h2>
            <div className="text-amber-200/70 space-y-1">
              <p className="font-medium text-amber-100">Felix Huisinga</p>
              <p>Sophienstraße 26</p>
              <p>30159 Hannover</p>
              <p>Deutschland</p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-[#12121f]/50 rounded-2xl border border-amber-500/10 p-6">
            <h2 className="text-lg font-medium text-amber-100 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              Kontakt
            </h2>
            <div className="text-amber-200/70 space-y-2">
              <p>
                <span className="text-amber-200/50">E-Mail:</span>{" "}
                <a href="mailto:felix@rabitem.de" className="text-violet-400 hover:text-violet-300 transition-colors">
                  felix@rabitem.de
                </a>
              </p>
              <p>
                <span className="text-amber-200/50">Website:</span>{" "}
                <a href="https://rabitem.de" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 transition-colors">
                  rabitem.de
                </a>
              </p>
            </div>
          </section>

          {/* Disclaimer */}
          <section className="bg-[#12121f]/50 rounded-2xl border border-amber-500/10 p-6">
            <h2 className="text-lg font-medium text-amber-100 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              Haftungsausschluss
            </h2>

            <div className="space-y-6 text-amber-200/70 text-sm leading-relaxed">
              <div>
                <h3 className="text-amber-100 font-medium mb-2">Haftung für Inhalte</h3>
                <p>
                  Die Inhalte dieser Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit,
                  Vollständigkeit und Aktualität der Inhalte kann ich jedoch keine Gewähr übernehmen.
                  Als Diensteanbieter bin ich gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten
                  nach den allgemeinen Gesetzen verantwortlich.
                </p>
              </div>

              <div>
                <h3 className="text-amber-100 font-medium mb-2">Haftung für Links</h3>
                <p>
                  Diese Website enthält Links zu externen Webseiten Dritter, auf deren Inhalte ich
                  keinen Einfluss habe. Deshalb kann ich für diese fremden Inhalte auch keine Gewähr
                  übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter
                  oder Betreiber der Seiten verantwortlich.
                </p>
              </div>

              <div>
                <h3 className="text-amber-100 font-medium mb-2">Urheberrecht</h3>
                <p>
                  Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen
                  dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art
                  der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen
                  Zustimmung des jeweiligen Autors bzw. Erstellers.
                </p>
              </div>
            </div>
          </section>

          {/* Project Info */}
          <section className="bg-[#12121f]/50 rounded-2xl border border-amber-500/10 p-6">
            <h2 className="text-lg font-medium text-amber-100 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              Über Wizard Party
            </h2>
            <p className="text-amber-200/70 text-sm leading-relaxed">
              Wizard Party ist ein kostenloses Online-Multiplayer-Kartenspiel, entwickelt als
              privates Hobbyprojekt. Das Spiel wird ohne kommerzielle Absichten betrieben
              und ist für alle Spieler kostenlos verfügbar.
            </p>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-amber-500/10 flex flex-wrap gap-6 text-sm">
          <Link href="/datenschutz" className="text-amber-400/60 hover:text-amber-300 transition-colors">
            Datenschutzerklärung
          </Link>
          <Link href="/" className="text-amber-400/60 hover:text-amber-300 transition-colors">
            Zurück zum Spiel
          </Link>
        </div>
      </div>
    </div>
  );
}
