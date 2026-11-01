import { THEME_PRESETS } from '@/presentation/components/settings';
import { GallerySection } from './gallery-section';

const CSS_VARIABLE_SWATCHES = ['--background', '--card', '--border', '--primary', '--muted', '--success', '--warning', '--danger'];
const AMBER_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/**
 * Each tile renders the way app screens do: the app's dark surfaces with the theme's
 * text/accent palette (the remapped amber scale from theme-palettes.css).
 */
export function UiThemeGallery() {
  return (
    <GallerySection id="ui" title="UI Themes">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {THEME_PRESETS.map((theme) => (
          <div key={theme.id} data-ui-theme={theme.id}
            className={`theme-${theme.id} rounded-lg p-4 space-y-3 border border-amber-800/40`}
            style={{ background: 'radial-gradient(ellipse at top, #1a1610 0%, #0f0d0a 60%, #080706 100%)' }}>
            <div className="flex items-center gap-2">
              <i className={`ra ${theme.icon} text-xl text-amber-400`} />
              <span className="text-sm text-amber-100 font-serif">{theme.name}</span>
              {theme.isNew ? (
                <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider rounded border border-amber-500/40 bg-amber-600/25 text-amber-200">New</span>
              ) : null}
            </div>
            <p className="text-xs text-amber-500/70">{theme.description}</p>
            <div className="rounded p-2 text-xs border border-amber-800/40 text-amber-200/90" style={{ background: 'rgba(26,21,16,0.6)' }}>
              Card surface
              <span className="ml-2 px-2 py-0.5 rounded border border-amber-600/50 bg-amber-700/40 text-amber-100">Button</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {AMBER_SHADES.map((shade) => (
                <div key={shade} title={`text palette ${shade}`} className="w-4 h-4 rounded-sm" style={{ background: `var(--color-amber-${shade})` }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {CSS_VARIABLE_SWATCHES.map((variable) => (
                <div key={variable} title={variable} className="w-6 h-4 rounded border border-black/20" style={{ background: `var(${variable})` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </GallerySection>
  );
}
