import type { ReactNode } from 'react';

export function GallerySection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} data-gallery-section={id} className="space-y-4">
      <h2 className="text-lg uppercase tracking-widest text-amber-300/80" style={{ fontFamily: 'Georgia, serif' }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function GalleryLabel({ name, isNew }: { name: string; isNew?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm text-amber-100/90" style={{ fontFamily: 'Georgia, serif' }}>
      <span>{name}</span>
      {isNew ? (
        <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider bg-orange-500/25 text-orange-200 rounded border border-orange-400/40">
          New
        </span>
      ) : null}
    </div>
  );
}
