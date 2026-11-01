import { Shield, Lock, Server, Cookie, Scale, Eye, KeyRound, Users, FileText, Gamepad2, UserCircle, BarChart3, Clock, Globe } from "lucide-react";

import { IMPRINT } from "@/config/deployment.config";

import { ConsentControls, PlayerIdNotice } from "./privacy-controls";
import { Basis, Divider, ExternalLink, Mail, Sub, Table, iconClass, listClass, strong } from "./privacy-ui";
import { GAME_RECORD_ROWS, RETENTION_ROWS, STORAGE_ROWS } from "./privacy-tables";

export interface SectionContent {
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
}

export const privacySections: SectionContent[] = [
  {
    icon: <Eye className={iconClass} />,
    title: "1. Privacy at a Glance",
    content: (
      <>
        <p>
          This policy explains which personal data we process when you use &quot;Wizard Party&quot;
          (wizardparty.fun), for what purposes, on which legal basis, for how long, and which rights you have
          under the General Data Protection Regulation (GDPR) and the German Telecommunications Digital Services
          Data Protection Act (TDDDG).
        </p>
        <div
          className="p-4 rounded border border-amber-600/30"
          style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--color-amber-800) 10%, transparent) 0%, color-mix(in srgb, var(--color-amber-900) 5%, transparent) 100%)" }}
        >
          <p className="text-amber-200/80">
            <strong>In short:</strong> You can play without an account and without giving us your name, email or
            real identity. To run, secure and improve the game, our game server records what happens in each game
            (moves, chat, settings, connection and device details) under a random player ID. Optional analytics
            on performance and errors in your browser only run with your consent. Player accounts are optional.
            We never sell data and never use advertising trackers.
          </p>
        </div>
      </>
    ),
  },
  {
    icon: <Shield className={iconClass} />,
    title: "2. Data Controller",
    content: (
      <div className="space-y-1">
        <p className="text-amber-200/90">{IMPRINT.name}</p>
        {IMPRINT.addressLines.map((line) => (
          <p key={line}>{line}</p>
        ))}
        <p className="mt-3">Email: <Mail /></p>
        <p className="mt-3 text-amber-400/60 text-xs">
          We are not required to appoint a data protection officer (§ 38 BDSG). Please send all privacy requests
          to the address above.
        </p>
      </div>
    ),
  },
  {
    icon: <Server className={iconClass} />,
    title: "3. Website Delivery and Hosting",
    content: (
      <>
        <Sub title="3.1 Server log data">
          <p>
            When you open the website, our hosting provider Vercel automatically processes the data your browser
            sends: IP address, date and time, requested URL, referrer, browser and operating system (user agent).
            This is technically necessary to deliver the website and to detect attacks. Logs are kept by Vercel
            only for a short period and are not combined with other data.
          </p>
          <Basis>Legal basis: Art. 6(1)(f) GDPR (legitimate interest in a secure, working website).</Basis>
        </Sub>
        <Divider />
        <Sub title="3.2 Game server">
          <p>
            Real-time gameplay runs over a secure WebSocket connection to our game server on Cloudflare Workers
            (Durable Objects). Cloudflare processes your IP address and connection data to establish the
            connection. The game state of a room is held on the game server while the room is in use.
          </p>
          <Basis>Legal basis: Art. 6(1)(b) GDPR (providing the game you requested).</Basis>
        </Sub>
        <Divider />
        <Sub title="3.3 Fonts">
          <p>
            All fonts are hosted on our own servers. Your browser does not connect to Google or other font
            providers.
          </p>
        </Sub>
      </>
    ),
  },
  {
    icon: <Gamepad2 className={iconClass} />,
    title: "4. Playing as a Guest",
    content: (
        <Sub title="4.1 Player ID, name and settings">
          <p>
            On your first visit we create a random player ID (e.g. <code>player-1700000000000-abc1234</code>) and
            store it in your browser&apos;s local storage together with your chosen player name, settings, sounds,
            recent rooms and local statistics. The player ID lets you reconnect to a running game. It contains no
            information about you.
          </p>
          <p>
            Your chosen player name is temporarily reserved on our servers (Upstash Redis) so that two players
            cannot use the same name at the same time; the reservation expires automatically after 5–30 minutes
            of inactivity. Anonymous, aggregated counters (e.g. total games played) are stored without any
            reference to you.
          </p>
          <Basis>
            Legal basis: § 25(2) No. 2 TDDDG (storage strictly necessary for the service you requested) and
            Art. 6(1)(b) GDPR.
          </Basis>
        </Sub>
    ),
  },
  {
    icon: <FileText className={iconClass} />,
    title: "5. Game Records (Server Telemetry)",
    content: (
      <>
        <p>
          Our game server records events of every game in our database, linked to the room, the game and your
          random player ID (and, if you are signed in, nothing more than that ID). We do <strong className={strong}>not</strong> store
          IP addresses in these records.
        </p>
        <Table
          head={["Data", "Examples", "Kept for"]}
          rows={GAME_RECORD_ROWS}
        />
        <p>
          <strong className={strong}>Purposes:</strong> operating and debugging the game (reconstructing exactly what
          happened when something goes wrong), detecting cheating, abuse and harmful chat content, securing the
          service, and improving game balance and compatibility with browsers and devices based on aggregated
          statistics.
        </p>
        <Basis>
          Legal basis: Art. 6(1)(f) GDPR. Our legitimate interest lies in a stable, fair and secure game. The
          records are pseudonymous, contain no IP addresses and are deleted on a fixed schedule. You can object at
          any time (section 12).
        </Basis>
      </>
    ),
  },
  {
    icon: <UserCircle className={iconClass} />,
    title: "6. Optional Player Accounts",
    content: (
      <>
        <p>
          You can create an account to keep your progress across devices. Without an account nothing in this
          section applies to you.
        </p>
        <Sub title="6.1 What we store">
          <ul className={listClass}>
            <li>Identity: email address, verification status, username (your one player name, with the casing you chose and the time of your last rename), profile picture URL from a sign-in provider</li>
            <li>Credentials: password hash (only if you set a password), passkey public keys and metadata, encrypted two-factor secret and backup codes, failed sign-in counters</li>
            <li>Linked sign-in providers (Google, Discord, GitHub, if enabled): provider account ID, access and refresh tokens, granted scope</li>
            <li>Sessions: session token, expiry, IP address and user agent of the signed-in device</li>
            <li>One-time email codes (stored hashed, valid 10 minutes)</li>
            <li>Profile: tagline, visibility settings</li>
            <li>Progress: results of finished games (placement, score, bids and tricks per round), statistics, XP, level, achievements, pinned games, imported guest statistics</li>
            <li>Synced settings and custom sounds you upload (audio file up to 2 MB plus name, duration and category)</li>
            <li>Friends: your friend list (with pins), sent and received friend requests, players you blocked, and your friend and invite settings</li>
            <li>Inbox: notifications such as friend requests and game invites (who sent them, the room code, read and answered state)</li>
            <li>Tournaments: tournaments you host or enter (with your username and level at sign-up), your seat at each table, match results (placement, score, bids and tricks per round, no-show), final placement and awards</li>
          </ul>
        </Sub>
        <Divider />
        <Sub title="6.2 Public profile">
          <p>
            Your profile at <code>/u/&lt;username&gt;</code> is public by default and shows
            username, tagline, avatar, level, statistics, achievements, tournament trophies (award, placement,
            field size, date; the tournament&apos;s name only for public tournaments), pinned games and, only if you
            enable it, your recent games. Email addresses and internal IDs are never shown. You can make the
            profile private in your account settings at any time.
          </p>
        </Sub>
        <Divider />
        <Sub title="6.3 Friends, online status and invites">
          <p>
            Only signed-in players use these features. While the site is open, your browser reports every
            25&ndash;60 seconds that you are online and whether you are in the menus, a lobby or a game (with the
            room code; to confirm you really sit at that table, our game server checks your browser&apos;s game
            session ID, which is not stored). This status is kept for about two minutes and shown only to your friends; as
            &quot;Invisible&quot; you appear offline. Friends see the room code only while you wait in a lobby, so they
            can join. Signed-in players play under their username; players at the same table can see the account behind a
            seat so they can add each other. Search shows public profiles by name and any account by its exact name. Inbox
            notifications are deleted after 30 days, declined friend requests after 3 days. If a friend invites
            you, or someone sends you a friend request, while you are offline, we email you (via Resend, see 6.4);
            to an address you have not verified yet only a few times a day.
            Each kind can be turned off separately under Profile &rarr; Communication or with the unsubscribe
            link in the email.
          </p>
          <Basis>
            Legal basis: Art. 6(1)(b) GDPR (the friend features you use); invite emails: Art. 6(1)(f) GDPR
            (letting your friends reach you), with a one-click opt-out at any time (Art. 21 GDPR).
          </Basis>
        </Sub>
        <Divider />
        <Sub title="6.4 Sign-in, email and password checks">
          <p>
            Verification, password-reset, two-factor, deletion-confirmation and game invite emails are sent via Resend
            (Resend, Inc., USA). When you set a password, we check it against known data breaches using the
            &quot;Have I Been Pwned&quot; range API: only the first 5 characters of the password&apos;s SHA-1 hash leave
            our server, never the password. If you sign in with Google, Discord or GitHub, we receive your name,
            email, profile picture URL and provider ID from that provider.
          </p>
        </Sub>
        <Divider />
        <Sub title="6.5 Storage period and self-service">
          <p>
            Sessions expire after 60 days of inactivity or immediately when you sign out. Everything else is kept
            until you delete your account. In your account under &quot;Data&quot; you can download all your data
            (Art. 15, 20 GDPR) and delete your account (Art. 17 GDPR); deletion removes all account records and
            uploaded files.
          </p>
          <Basis>
            Legal basis: Art. 6(1)(b) GDPR (account contract); public profile and breach check: Art. 6(1)(f) GDPR
            (protecting your account, letting players show their progress; you control visibility).
          </Basis>
        </Sub>
        <Divider />
        <Sub title="6.6 Tournaments">
          <p>
            Signed-in players can host and enter tournaments. Everyone who can open a tournament page (anyone for
            public tournaments, only holders of the invite link for private ones) sees the names of its entrants,
            the tables, standings and awards. To seat you at your table, our server issues a signed, short-lived
            seat pass that your browser keeps in session storage until the tab is closed; our game server checks
            it and reports the result of the match (placement, score, bids and tricks per round, whether you
            showed up) back to our server. Players see entrants by username; tournament pages and seat passes
            also carry the random internal ID of each entrant&apos;s account (it reveals nothing else about you), so
            results can be matched to accounts. If you delete your account, tournaments you host that have not
            started are cancelled, your name is removed from every tournament you hosted, and your entries,
            results and awards are deleted; tournaments already running continue without you. Your data export
            includes your entries and every stored result.
          </p>
          <Basis>Legal basis: Art. 6(1)(b) GDPR (the tournament you host or enter).</Basis>
        </Sub>
      </>
    ),
  },
  {
    icon: <BarChart3 className={iconClass} />,
    title: "7. Analytics (Only With Your Consent)",
    content: (
      <>
        <p>
          Only if you choose &quot;Accept analytics&quot; in the privacy banner do we read information from your
          browser and device and send it to us. Without consent, none of this happens and the game works exactly
          the same.
        </p>
        <Sub title="7.1 Our own performance, device and error metrics">
          <ul className={listClass}>
            <li>Device and browser profile: browser, operating system, device model and type, screen and window size, pixel density, CPU cores, memory class, graphics card (WebGL renderer), language, time zone, network type, accessibility preferences such as reduced motion</li>
            <li>Loading and responsiveness: Core Web Vitals (LCP, INP, CLS, FCP, TTFB)</li>
            <li>Game connection quality: connection time, disconnects, reconnects, latency of your moves</li>
            <li>Rendering: frame rate, long tasks, memory usage, graphics context losses</li>
            <li>JavaScript errors with error message and code location</li>
          </ul>
          <p>
            These records carry a random ID per browser tab and, to connect them with the game records, your
            player ID and room. Your IP address is used only briefly to block abuse of the endpoint and is not
            stored; we store the country derived by our host. Kept for 90 days.
          </p>
        </Sub>
        <Divider />
        <Sub title="7.2 Vercel Web Analytics and Speed Insights">
          <p>
            Vercel Inc. provides aggregated visitor and performance statistics without cookies and without
            cross-site tracking. See the{" "}
            <ExternalLink href="https://vercel.com/docs/analytics/privacy-policy">Vercel Analytics privacy policy</ExternalLink>.
          </p>
        </Sub>
        <Basis>
          Legal basis: § 25(1) TDDDG and Art. 6(1)(a) GDPR (consent). Your consent is valid for 12 months and can be
          withdrawn at any time with effect for the future, as easily as you gave it:
        </Basis>
        <ConsentControls />
      </>
    ),
  },
  {
    icon: <Cookie className={iconClass} />,
    title: "8. Cookies and Local Storage",
    content: (
      <>
        <p>We do not use advertising or cross-site tracking cookies.</p>
        <Table
          head={["Name", "Purpose", "Duration", "Type"]}
          rows={STORAGE_ROWS}
        />
        <Basis>
          Legal basis for necessary storage: § 25(2) No. 2 TDDDG; for analytics: § 25(1) TDDDG (consent).
        </Basis>
      </>
    ),
  },
  {
    icon: <Globe className={iconClass} />,
    title: "9. Recipients and International Transfers",
    content: (
      <>
        <p>We use the following service providers, bound by data processing agreements (Art. 28 GDPR):</p>
        <ul className={listClass}>
          <li><strong className={strong}>Vercel Inc.</strong>, USA – website hosting, API, analytics, file storage (Vercel Blob) – <ExternalLink href="https://vercel.com/legal/privacy-policy">privacy policy</ExternalLink></li>
          <li><strong className={strong}>Cloudflare, Inc.</strong>, USA – game server – <ExternalLink href="https://www.cloudflare.com/privacypolicy/">privacy policy</ExternalLink></li>
          <li><strong className={strong}>Neon, Inc.</strong>, USA – database (hosted in Frankfurt, Germany) – <ExternalLink href="https://neon.com/privacy-policy">privacy policy</ExternalLink></li>
          <li><strong className={strong}>Upstash, Inc.</strong>, USA – temporary name reservations and rate limiting – <ExternalLink href="https://upstash.com/trust/privacy.pdf">privacy policy</ExternalLink></li>
          <li><strong className={strong}>Resend, Inc.</strong>, USA – account emails – <ExternalLink href="https://resend.com/legal/privacy-policy">privacy policy</ExternalLink></li>
        </ul>
        <p>
          Sign-in providers (Google, Discord, GitHub) and Have I Been Pwned are independent controllers and only
          involved if you use the respective feature.
        </p>
        <p>
          Our database and server functions run in Frankfurt, Germany. The providers above are US companies, and
          some data is processed in the USA (e.g. uploaded custom sounds in Vercel Blob, global edge delivery).
          Transfers are based on the EU-US Data Privacy Framework
          adequacy decision (Art. 45 GDPR) where the provider is certified, and otherwise on the EU Standard
          Contractual Clauses (Art. 46(2)(c) GDPR) included in the providers&apos; data processing agreements.
        </p>
      </>
    ),
  },
  {
    icon: <Clock className={iconClass} />,
    title: "10. Storage Periods",
    content: (
      <>
        <Table
          head={["Data", "Deleted after"]}
          rows={RETENTION_ROWS}
        />
        <p>Deletion runs automatically every day. Statutory retention obligations remain unaffected.</p>
      </>
    ),
  },
  {
    icon: <Scale className={iconClass} />,
    title: "11. Legal Bases",
    content: (
      <ul className="list-disc list-inside space-y-2 ml-2 text-amber-300/60">
        <li><strong className={strong}>Art. 6(1)(a) GDPR, § 25(1) TDDDG</strong> – consent (analytics)</li>
        <li><strong className={strong}>Art. 6(1)(b) GDPR</strong> – providing the game and player accounts</li>
        <li><strong className={strong}>Art. 6(1)(f) GDPR</strong> – legitimate interests: secure delivery, game records, abuse prevention, account protection</li>
        <li><strong className={strong}>§ 25(2) No. 2 TDDDG</strong> – storage in your browser that is strictly necessary for the game</li>
      </ul>
    ),
  },
  {
    icon: <KeyRound className={iconClass} />,
    title: "12. Your Rights",
    content: (
      <>
        <p>You have the right to:</p>
        <ul className="list-disc list-inside space-y-2 ml-2 text-amber-300/60">
          <li><strong className={strong}>Access (Art. 15 GDPR)</strong> to the data we hold about you</li>
          <li><strong className={strong}>Rectification (Art. 16 GDPR)</strong> of inaccurate data</li>
          <li><strong className={strong}>Erasure (Art. 17 GDPR)</strong> of your data</li>
          <li><strong className={strong}>Restriction of processing (Art. 18 GDPR)</strong></li>
          <li><strong className={strong}>Data portability (Art. 20 GDPR)</strong></li>
          <li><strong className={strong}>Withdraw consent (Art. 7(3) GDPR)</strong> at any time with effect for the future (section 7)</li>
          <li>
            <strong className={strong}>Lodge a complaint</strong> with a supervisory authority, e.g. the one responsible
            for us: Der Hessische Beauftragte für Datenschutz und Informationsfreiheit, Gustav-Stresemann-Ring 1,
            65189 Wiesbaden, <ExternalLink href="https://datenschutz.hessen.de">datenschutz.hessen.de</ExternalLink>
          </li>
        </ul>
        <div
          className="p-4 rounded border border-amber-600/30"
          style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--color-amber-800) 10%, transparent) 0%, color-mix(in srgb, var(--color-amber-900) 5%, transparent) 100%)" }}
        >
          <p className="text-amber-200/80">
            <strong>Right to object (Art. 21 GDPR):</strong> Where we process data based on legitimate interests
            (Art. 6(1)(f) GDPR), you can object at any time for reasons arising from your particular situation. We
            will then stop processing unless we can demonstrate compelling legitimate grounds or the processing
            serves the establishment, exercise or defence of legal claims.
          </p>
        </div>
        <p>
          Signed-in players can export and delete their data themselves in their account. For everything else,
          email <Mail />. Because guest records are only linked to a random player ID, please include it so we can
          find your data:
        </p>
        <PlayerIdNotice />
      </>
    ),
  },
  {
    icon: <FileText className={iconClass} />,
    title: "13. Obligation to Provide Data and Automated Decisions",
    content: (
      <p>
        You are not obliged to provide personal data. Without the technically necessary data (section 3–5) the
        game cannot be played; analytics and accounts are optional. We do not use automated decision-making or
        profiling within the meaning of Art. 22 GDPR.
      </p>
    ),
  },
  {
    icon: <Users className={iconClass} />,
    title: "14. Children and Minors",
    content: (
      <p>
        Wizard Party is a family-friendly card game. Players under 16 may only consent to analytics or create an
        account with the consent of a parent or guardian (Art. 8 GDPR, § 25 TDDDG). Please do not use your real
        name as player name or username. If you believe a child has provided personal data without permission,
        contact us and we will delete it.
      </p>
    ),
  },
  {
    icon: <Lock className={iconClass} />,
    title: "15. Data Security",
    content: (
      <>
        <p>
          We protect your data with technical and organisational measures (Art. 32 GDPR), including:
        </p>
        <ul className={listClass}>
          <li>TLS encryption for all connections, including the game server (WSS)</li>
          <li>Signed, authenticated transfer of game records between our servers</li>
          <li>Pseudonymous game records without IP addresses, automatic deletion schedules</li>
          <li>Hashed passwords and codes, encrypted two-factor secrets, optional passkeys</li>
          <li>Rate limiting and input validation on all public endpoints</li>
        </ul>
      </>
    ),
  },
  {
    icon: <FileText className={iconClass} />,
    title: "16. Changes to This Privacy Policy",
    content: (
      <p>
        We update this policy when our services or the law change. If a change affects what you consented to, we
        will ask for your consent again.
      </p>
    ),
  },
];
