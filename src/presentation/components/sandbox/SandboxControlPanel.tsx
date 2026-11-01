'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SANDBOX_DEFAULTS } from '../../config/sandbox.config';
import { loadGameSettings } from '../settings';
import { SANDBOX_UI_ATTRIBUTE } from './layout-audit';
import { getSandboxDimensions } from './sandbox-dimensions';
import type { SandboxController, SandboxStatusSnapshot } from './sandbox-controller';
import type { Anomaly, SandboxClock, SandboxSettings } from './sandbox.types';

const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;
const SEVERITY_ORDER = { error: 0, warn: 1, info: 2 } as const;
const SEVERITY_DOT = { error: 'bg-red-500', warn: 'bg-amber-400', info: 'bg-sky-400' } as const;

const sandboxUi = { [SANDBOX_UI_ATTRIBUTE]: '' };

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-amber-100/55">
      {label}
      {children}
    </label>
  );
}

function Select({ value, options, onChange }: { value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 w-full min-w-0 rounded-md border border-amber-700/30 bg-black/50 px-2 text-sm normal-case tracking-normal text-amber-50 outline-none focus:border-amber-400"
    >
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

function Button({ children, onClick, disabled, tone = 'default', pressed }: { children: ReactNode; onClick: () => void; disabled?: boolean; tone?: 'default' | 'primary'; pressed?: boolean }) {
  const toneClass = tone === 'primary'
    ? 'border-amber-400/70 bg-amber-500/90 text-stone-950 hover:bg-amber-400'
    : pressed
      ? 'border-amber-400/60 bg-amber-500/20 text-amber-100'
      : 'border-amber-700/30 bg-black/40 text-amber-100/85 hover:bg-amber-900/30';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      className={`min-h-9 rounded-md border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
    >
      {children}
    </button>
  );
}

function AnomalyRow({ anomaly }: { anomaly: Anomaly }) {
  return (
    <li className="flex gap-2 border-b border-amber-900/20 py-1.5 last:border-0">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[anomaly.severity]}`} aria-label={anomaly.severity} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <code className="text-xs text-amber-200">{anomaly.code}</code>
          <span className="text-[10px] text-amber-100/40">{Math.round(anomaly.t)}ms{anomaly.count > 1 ? ` ×${anomaly.count}` : ''}</span>
        </div>
        <p className="break-words text-xs text-amber-50/75">{anomaly.message}</p>
      </div>
    </li>
  );
}

function useControllerStatus(controller: SandboxController): SandboxStatusSnapshot {
  const [status, setStatus] = useState(controller.getStatus());
  useEffect(() => controller.subscribe(setStatus), [controller]);
  return status;
}

function useClockStats(clock: SandboxClock) {
  const [stats, setStats] = useState(clock.stats());
  useEffect(() => {
    // Polled on the virtual clock's own frames (throttled), so it also updates while stepping.
    let lastPublished = 0;
    return clock.onFrame((_, frame) => {
      if (frame - lastPublished < 15) return;
      lastPublished = frame;
      setStats(clock.stats());
    });
  }, [clock]);
  return [stats, () => setStats(clock.stats())] as const;
}

/**
 * Sandbox chrome. Sidebar from md up, bottom sheet on phones, collapsible everywhere;
 * marked data-sandbox-ui so the layout audit ignores it.
 */
export function SandboxControlPanel({ controller, clock }: { controller: SandboxController; clock: SandboxClock }) {
  const dimensions = useMemo(() => getSandboxDimensions(), []);
  const status = useControllerStatus(controller);
  const [stats, refreshStats] = useClockStats(clock);
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 768);
  const [scenario, setScenario] = useState(dimensions.scenario[0]?.id ?? '');
  const [playerCount, setPlayerCount] = useState<number>(SANDBOX_DEFAULTS.PLAYER_COUNT);
  const [seed, setSeed] = useState<number>(SANDBOX_DEFAULTS.SEED);
  const [settings, setSettings] = useState<SandboxSettings>(() => {
    const { cardTheme, tableTheme, theme, collectionAnimation, cardNumberSize } = loadGameSettings();
    return { cardTheme, tableTheme, theme, collectionAnimation, cardNumberSize };
  });

  const busy = status.status === 'starting' || status.status === 'running' || status.status === 'settling';
  const report = status.lastReport;
  const anomalies = useMemo(
    () => [...(report?.anomalies ?? [])].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.t - b.t),
    [report]
  );

  const run = useCallback(() => {
    void controller.run({ scenario, playerCount, seed, settings }).catch((error) => console.warn('[sandbox] run failed', error));
  }, [controller, playerCount, scenario, seed, settings]);

  const setMode = (mode: 'play' | 'paused' | 'fast', speed = stats.speed) => {
    clock.setMode(mode, speed);
    refreshStats();
  };

  const copyReport = () => {
    if (report) void navigator.clipboard?.writeText(JSON.stringify(report, null, 2));
  };

  const optionList = (values: Array<string | number>) => values.map((value) => ({ value: String(value), label: String(value) }));
  const settingField = (label: string, key: keyof SandboxSettings) => (
    <Field label={label}>
      <Select
        value={settings[key]}
        options={optionList(dimensions[key])}
        onChange={(value) => setSettings((previous) => ({ ...previous, [key]: value }))}
      />
    </Field>
  );

  const statusLabel = busy ? `${status.status}${status.step ? ` · ${status.step}` : ''}` : report ? (report.passed ? 'passed' : `${anomalies.length} finding(s)`) : 'ready';

  if (!open) {
    return (
      <button
        {...sandboxUi}
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-[60] flex min-h-11 max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border border-amber-600/40 bg-stone-950/90 px-4 text-sm text-amber-100 shadow-lg backdrop-blur"
      >
        <span className={`h-2 w-2 rounded-full ${busy ? 'animate-pulse bg-amber-400' : report && !report.passed ? 'bg-red-500' : 'bg-emerald-400'}`} />
        <span className="truncate">Sandbox · {statusLabel}</span>
      </button>
    );
  }

  return (
    <aside
      {...sandboxUi}
      aria-label="Animation sandbox controls"
      className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[70dvh] flex-col rounded-t-2xl border border-amber-700/30 bg-stone-950/95 pb-[env(safe-area-inset-bottom)] text-amber-50 shadow-2xl backdrop-blur md:inset-x-auto md:bottom-3 md:left-3 md:top-3 md:max-h-none md:w-[min(22rem,calc(100vw-1.5rem))] md:rounded-2xl md:pb-0"
    >
      <header className="flex items-center gap-2 border-b border-amber-800/30 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold tracking-wide text-amber-100">Animation sandbox</h2>
          <p className="truncate text-xs text-amber-100/55">{statusLabel}</p>
        </div>
        <Button onClick={() => setOpen(false)}>Hide</Button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-3">
        <section className="space-y-2">
          <Field label="Scenario">
            <Select
              value={scenario}
              options={dimensions.scenario.map((entry) => ({ value: entry.id, label: entry.title }))}
              onChange={setScenario}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Players">
              <Select value={String(playerCount)} options={optionList(dimensions.playerCount)} onChange={(value) => setPlayerCount(Number(value))} />
            </Field>
            <Field label="Seed">
              <input
                type="number"
                inputMode="numeric"
                value={seed}
                onChange={(event) => setSeed(Number(event.target.value) || 0)}
                className="h-9 w-full min-w-0 rounded-md border border-amber-700/30 bg-black/50 px-2 text-sm text-amber-50 outline-none focus:border-amber-400"
              />
            </Field>
            {settingField('Card theme', 'cardTheme')}
            {settingField('Table theme', 'tableTheme')}
            {settingField('UI theme', 'theme')}
            {settingField('Collection', 'collectionAnimation')}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button tone="primary" onClick={run} disabled={busy}>Run</Button>
            <Button onClick={() => controller.stop()} disabled={busy}>Clear table</Button>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-amber-100/55">Clock · frame {stats.frame}</h3>
          <div className="flex flex-wrap gap-2">
            <Button pressed={stats.mode === 'play'} onClick={() => setMode('play')}>Play</Button>
            <Button pressed={stats.mode === 'paused'} onClick={() => setMode('paused')}>Pause</Button>
            <Button onClick={() => { void clock.step(1).then(refreshStats); }} disabled={stats.mode !== 'paused'}>Step</Button>
            <Button pressed={stats.mode === 'fast'} onClick={() => setMode('fast')}>Fast</Button>
          </div>
          <Field label="Speed">
            <Select
              value={String(stats.speed)}
              options={SPEEDS.map((speed) => ({ value: String(speed), label: `${speed}×` }))}
              onChange={(value) => setMode(stats.mode === 'paused' ? 'paused' : 'play', Number(value))}
            />
          </Field>
        </section>

        {report ? (
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[11px] font-medium uppercase tracking-wide text-amber-100/55">
                {report.scenario} · {report.metrics.frames} frames
              </h3>
              <Button onClick={copyReport}>Copy JSON</Button>
            </div>
            {anomalies.length === 0 ? (
              <p className="text-sm text-emerald-300">No timing or animation issues.</p>
            ) : (
              <ul className="rounded-md border border-amber-900/30 bg-black/30 px-2">
                {anomalies.map((anomaly) => <AnomalyRow key={`${anomaly.code}-${anomaly.subject ?? ''}-${anomaly.t}`} anomaly={anomaly} />)}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </aside>
  );
}
