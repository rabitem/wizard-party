// Shared building blocks for the privacy policy sections.

import { IMPRINT } from "@/config/deployment.config";

/** The operator's contact address: the imprint's (NEXT_PUBLIC_IMPRINT_EMAIL). */
export const CONTACT_EMAIL = IMPRINT.email;
export const iconClass = "w-4 h-4 text-amber-600/60";
export const strong = "text-amber-200/80";
export const listClass = "list-disc list-inside space-y-1 ml-2 text-amber-300/60";
export const linkClass = "text-amber-400 hover:text-amber-300 transition-colors";

export function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-amber-200/90 mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/20" />
      <span className="text-amber-700/40 text-xs">✦</span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/20" />
    </div>
  );
}

export function Basis({ children }: { children: React.ReactNode }) {
  return <p className="text-amber-400/60 text-xs">{children}</p>;
}

export function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {children}
    </a>
  );
}

export function Table({ head, rows }: { head: string[]; rows: [string, ...React.ReactNode[]][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="text-amber-200/80">
          <tr>
            {head.map((cell) => (
              <th key={cell} className="border-b border-amber-700/30 py-1.5 pr-3 font-normal">{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody className="text-amber-300/60">
          {rows.map(([first, ...rest]) => (
            <tr key={String(first)} className="border-b border-amber-700/10 align-top">
              <td className="py-1.5 pr-3">{first}</td>
              {rest.map((cell, j) => (
                <td key={head[j + 1]} className="py-1.5 pr-3">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const Mail = () => <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>{CONTACT_EMAIL}</a>;
