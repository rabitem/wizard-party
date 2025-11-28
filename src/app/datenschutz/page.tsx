import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description: "Datenschutzerklärung für Wizard Party - Informationen zur Verarbeitung Ihrer Daten",
  robots: {
    index: true,
    follow: true,
  },
};

export default function DatenschutzPage() {
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-light text-amber-100 tracking-wide">Datenschutzerklärung</h1>
          </div>
          <p className="text-amber-200/50 text-sm">Stand: November 2025</p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Introduction */}
          <section className="bg-[#12121f]/50 rounded-2xl border border-amber-500/10 p-6">
            <h2 className="text-lg font-medium text-amber-100 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              1. Datenschutz auf einen Blick
            </h2>
            <div className="space-y-4 text-amber-200/70 text-sm leading-relaxed">
              <p>
                Diese Datenschutzerklärung klärt Sie über die Art, den Umfang und Zweck der Verarbeitung
                von personenbezogenen Daten innerhalb unseres Onlineangebotes &quot;Wizard Party&quot; und der
                mit ihm verbundenen Webseiten, Funktionen und Inhalte auf.
              </p>
              <p>
                <strong className="text-amber-100">Kurz zusammengefasst:</strong> Wizard Party ist so konzipiert,
                dass möglichst wenige Daten erhoben werden. Wir speichern keine Accounts, keine E-Mail-Adressen
                und keine persönlichen Daten. Spielerdaten existieren nur temporär während einer Spielsitzung.
              </p>
            </div>
          </section>

          {/* Responsible Person */}
          <section className="bg-[#12121f]/50 rounded-2xl border border-amber-500/10 p-6">
            <h2 className="text-lg font-medium text-amber-100 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              2. Verantwortlicher
            </h2>
            <div className="text-amber-200/70 text-sm space-y-1">
              <p className="font-medium text-amber-100">Felix Huisinga</p>
              <p>Mannstaedtstr. 16</p>
              <p>65187 Wiesbaden</p>
              <p>Deutschland</p>
              <p className="mt-3">
                E-Mail:{" "}
                <a href="mailto:felix@rabitem.de" className="text-violet-400 hover:text-violet-300 transition-colors">
                  felix@rabitem.de
                </a>
              </p>
            </div>
          </section>

          {/* Data Collection */}
          <section className="bg-[#12121f]/50 rounded-2xl border border-amber-500/10 p-6">
            <h2 className="text-lg font-medium text-amber-100 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              3. Erhobene Daten
            </h2>
            <div className="space-y-6 text-amber-200/70 text-sm leading-relaxed">
              <div>
                <h3 className="text-amber-100 font-medium mb-2">3.1 Spielbezogene Daten (temporär)</h3>
                <p className="mb-2">Während des Spielens werden folgende Daten temporär verarbeitet:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Gewählter Spielername (frei wählbar, kein Klarname erforderlich)</li>
                  <li>Gewählter Avatar</li>
                  <li>Spielzustände und Aktionen während einer Partie</li>
                  <li>Chat-Nachrichten innerhalb des Spiels</li>
                </ul>
                <p className="mt-2 text-amber-200/50">
                  Diese Daten werden nur im Arbeitsspeicher gehalten und nach Beendigung der Spielsitzung
                  vollständig gelöscht. Es erfolgt keine dauerhafte Speicherung.
                </p>
              </div>

              <div>
                <h3 className="text-amber-100 font-medium mb-2">3.2 Technisch notwendige Daten</h3>
                <p className="mb-2">Bei der Nutzung der Website werden automatisch folgende Daten erhoben:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>IP-Adresse (anonymisiert in Server-Logs)</li>
                  <li>Browsertyp und -version</li>
                  <li>Betriebssystem</li>
                  <li>Datum und Uhrzeit des Zugriffs</li>
                </ul>
              </div>

              <div>
                <h3 className="text-amber-100 font-medium mb-2">3.3 Local Storage</h3>
                <p>
                  Wizard Party speichert Ihre Spieleinstellungen (wie Lautstärke, gewähltes Kartendeck,
                  Avatar) lokal in Ihrem Browser (Local Storage). Diese Daten verlassen niemals Ihr Gerät
                  und werden nicht an uns übertragen.
                </p>
              </div>
            </div>
          </section>

          {/* Cookies */}
          <section className="bg-[#12121f]/50 rounded-2xl border border-amber-500/10 p-6">
            <h2 className="text-lg font-medium text-amber-100 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              4. Cookies
            </h2>
            <div className="space-y-4 text-amber-200/70 text-sm leading-relaxed">
              <p>
                Wizard Party verwendet <strong className="text-amber-100">nur technisch notwendige Cookies</strong>.
                Diese sind erforderlich für:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Die WebSocket-Verbindung zum Spielserver</li>
                <li>Die Speicherung Ihrer Cookie-Präferenzen</li>
              </ul>
              <p>
                Wir verwenden <strong className="text-amber-100">keine</strong> Tracking-Cookies, Analyse-Tools
                wie Google Analytics oder Werbe-Cookies. Ihre Privatsphäre ist uns wichtig.
              </p>
            </div>
          </section>

          {/* Third Party Services */}
          <section className="bg-[#12121f]/50 rounded-2xl border border-amber-500/10 p-6">
            <h2 className="text-lg font-medium text-amber-100 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              5. Drittanbieter-Dienste
            </h2>
            <div className="space-y-6 text-amber-200/70 text-sm leading-relaxed">
              <div>
                <h3 className="text-amber-100 font-medium mb-2">5.1 Hosting (Vercel)</h3>
                <p>
                  Unsere Website wird bei Vercel Inc. (340 S Lemon Ave #4133, Walnut, CA 91789, USA) gehostet.
                  Vercel verarbeitet Zugriffsdaten im Rahmen einer Auftragsverarbeitung. Weitere Informationen
                  finden Sie in der{" "}
                  <a
                    href="https://vercel.com/legal/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    Datenschutzerklärung von Vercel
                  </a>
                  .
                </p>
              </div>

              <div>
                <h3 className="text-amber-100 font-medium mb-2">5.2 WebSocket-Server (PartyKit)</h3>
                <p>
                  Für die Echtzeit-Kommunikation während des Spiels nutzen wir PartyKit. Die Verbindungsdaten
                  werden nur für die Dauer der Spielsitzung verarbeitet. Weitere Informationen finden Sie in der{" "}
                  <a
                    href="https://partykit.io/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    Datenschutzerklärung von PartyKit
                  </a>
                  .
                </p>
              </div>

              <div>
                <h3 className="text-amber-100 font-medium mb-2">5.3 Google Fonts</h3>
                <p>
                  Diese Seite nutzt Google Fonts für die einheitliche Darstellung von Schriftarten.
                  Beim Aufruf einer Seite lädt Ihr Browser die benötigten Fonts direkt von Google.
                  Dabei kann Ihre IP-Adresse an Google übertragen werden. Weitere Informationen finden
                  Sie in der{" "}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    Datenschutzerklärung von Google
                  </a>
                  .
                </p>
              </div>
            </div>
          </section>

          {/* Legal Basis */}
          <section className="bg-[#12121f]/50 rounded-2xl border border-amber-500/10 p-6">
            <h2 className="text-lg font-medium text-amber-100 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              6. Rechtsgrundlage
            </h2>
            <div className="space-y-4 text-amber-200/70 text-sm leading-relaxed">
              <p>Die Verarbeitung personenbezogener Daten erfolgt auf Grundlage von:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  <strong className="text-amber-100">Art. 6 Abs. 1 lit. b DSGVO</strong> – Vertragserfüllung:
                  Die Bereitstellung des Spieldienstes
                </li>
                <li>
                  <strong className="text-amber-100">Art. 6 Abs. 1 lit. f DSGVO</strong> – Berechtigtes Interesse:
                  Gewährleistung der technischen Funktionalität und Sicherheit
                </li>
                <li>
                  <strong className="text-amber-100">Art. 6 Abs. 1 lit. a DSGVO</strong> – Einwilligung:
                  Für optionale Funktionen, sofern eine Einwilligung eingeholt wurde
                </li>
              </ul>
            </div>
          </section>

          {/* Your Rights */}
          <section className="bg-[#12121f]/50 rounded-2xl border border-amber-500/10 p-6">
            <h2 className="text-lg font-medium text-amber-100 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              7. Ihre Rechte
            </h2>
            <div className="space-y-4 text-amber-200/70 text-sm leading-relaxed">
              <p>Sie haben nach der DSGVO folgende Rechte:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong className="text-amber-100">Auskunftsrecht (Art. 15 DSGVO)</strong> – Auskunft über Ihre verarbeiteten Daten</li>
                <li><strong className="text-amber-100">Berichtigungsrecht (Art. 16 DSGVO)</strong> – Berichtigung unrichtiger Daten</li>
                <li><strong className="text-amber-100">Löschungsrecht (Art. 17 DSGVO)</strong> – Löschung Ihrer Daten</li>
                <li><strong className="text-amber-100">Einschränkung (Art. 18 DSGVO)</strong> – Einschränkung der Verarbeitung</li>
                <li><strong className="text-amber-100">Datenübertragbarkeit (Art. 20 DSGVO)</strong> – Erhalt Ihrer Daten in maschinenlesbarem Format</li>
                <li><strong className="text-amber-100">Widerspruchsrecht (Art. 21 DSGVO)</strong> – Widerspruch gegen die Verarbeitung</li>
                <li><strong className="text-amber-100">Beschwerderecht</strong> – Beschwerde bei einer Aufsichtsbehörde</li>
              </ul>
              <p className="mt-4">
                Da Wizard Party keine dauerhaften personenbezogenen Daten speichert, sind viele dieser
                Rechte praktisch gegenstandslos. Für Anfragen wenden Sie sich bitte an:{" "}
                <a href="mailto:felix@rabitem.de" className="text-violet-400 hover:text-violet-300 transition-colors">
                  felix@rabitem.de
                </a>
              </p>
            </div>
          </section>

          {/* Data Security */}
          <section className="bg-[#12121f]/50 rounded-2xl border border-amber-500/10 p-6">
            <h2 className="text-lg font-medium text-amber-100 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              8. Datensicherheit
            </h2>
            <div className="space-y-4 text-amber-200/70 text-sm leading-relaxed">
              <p>
                Wir verwenden technische und organisatorische Sicherheitsmaßnahmen, um Ihre Daten
                gegen Manipulation, Verlust, Zerstörung oder den Zugriff unberechtigter Personen zu schützen.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>SSL/TLS-Verschlüsselung für alle Datenübertragungen</li>
                <li>Sichere WebSocket-Verbindungen (WSS)</li>
                <li>Keine dauerhafte Speicherung sensibler Daten</li>
                <li>Regelmäßige Sicherheitsüberprüfungen</li>
              </ul>
            </div>
          </section>

          {/* Children */}
          <section className="bg-[#12121f]/50 rounded-2xl border border-amber-500/10 p-6">
            <h2 className="text-lg font-medium text-amber-100 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              9. Kinder und Jugendliche
            </h2>
            <div className="text-amber-200/70 text-sm leading-relaxed">
              <p>
                Wizard Party ist ein familienfreundliches Kartenspiel ohne Altersbeschränkung.
                Da wir keine personenbezogenen Daten erheben oder speichern, ist keine besondere
                Einwilligung durch Erziehungsberechtigte erforderlich.
              </p>
            </div>
          </section>

          {/* Changes */}
          <section className="bg-[#12121f]/50 rounded-2xl border border-amber-500/10 p-6">
            <h2 className="text-lg font-medium text-amber-100 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              10. Änderungen dieser Datenschutzerklärung
            </h2>
            <div className="text-amber-200/70 text-sm leading-relaxed">
              <p>
                Diese Datenschutzerklärung kann gelegentlich aktualisiert werden, um Änderungen
                in unseren Praktiken oder aus anderen betrieblichen, rechtlichen oder regulatorischen
                Gründen widerzuspiegeln. Wir empfehlen, diese Seite regelmäßig zu besuchen.
              </p>
            </div>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-amber-500/10 flex flex-wrap gap-6 text-sm">
          <Link href="/impressum" className="text-amber-400/60 hover:text-amber-300 transition-colors">
            Impressum
          </Link>
          <Link href="/" className="text-amber-400/60 hover:text-amber-300 transition-colors">
            Zurück zum Spiel
          </Link>
        </div>
      </div>
    </div>
  );
}
