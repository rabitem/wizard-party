'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Bot, CalendarClock, ChevronDown, Globe, LayoutGrid, Lock, Network, Scroll, Swords } from 'lucide-react';

import { TOURNAMENT_FORMATS, TOURNAMENT_LIMITS, minimumEntrants, type TournamentFormatId } from '@shared/domain/tournament';
import { countNonDefaultRules } from '@shared/domain/value-objects/ruleset-validation';

import { BOT_DIFFICULTY_OPTIONS } from '@/presentation/config/tournament.config';

import { FIELD_BG, INSET_BG } from '../account/account-surfaces';
import { Button, Field, Notice, Panel, SectionHeading, Toggle } from '../account/ui';
import { RulesetSection } from '../settings';
import { FieldLabel, FieldMessage, Segmented, Stepper, TextArea, type SegmentOption } from './TournamentFormControls';
import {
  formSettings,
  hasFormErrors,
  updateFormState,
  validateTournamentForm,
  type TournamentFormErrors,
  type TournamentFormState,
} from './tournament-form';
import { describeSeating, previewStructure } from './tournament-view-model';

/** Icons of the formats in TOURNAMENT_FORMATS; a new format falls back to the generic one. */
const FORMAT_ICONS: Partial<Record<TournamentFormatId, ReactNode>> = {
  series: <LayoutGrid className="w-5 h-5" />,
  knockout: <Network className="w-5 h-5" />,
};

const FORMAT_OPTIONS: SegmentOption<TournamentFormatId>[] = Object.values(TOURNAMENT_FORMATS).map((format) => ({
  value: format.id,
  label: format.name,
  description: format.description,
  icon: FORMAT_ICONS[format.id] ?? <Swords className="w-5 h-5" />,
}));

const TABLE_SIZE_OPTIONS: SegmentOption<number>[] = Array.from(
  { length: TOURNAMENT_LIMITS.MAX_TABLE_SIZE - TOURNAMENT_LIMITS.MIN_TABLE_SIZE + 1 },
  (_, index) => {
    const size = TOURNAMENT_LIMITS.MIN_TABLE_SIZE + index;
    return { value: size, label: String(size) };
  }
);

const VISIBILITY_OPTIONS: SegmentOption<'public' | 'private'>[] = [
  { value: 'public', label: 'Public', description: 'Listed on the tournament board; anyone signed in can enter.', icon: <Globe className="w-5 h-5" /> },
  { value: 'private', label: 'Private', description: 'Hidden. Only people with your invite link can see and enter.', icon: <Lock className="w-5 h-5" /> },
];

function advanceOptions(maxTableSize: number): SegmentOption<number | null>[] {
  const counts = Array.from({ length: maxTableSize - 1 }, (_, index) => index + 1);
  return [{ value: null, label: 'Top half' }, ...counts.map((count) => ({ value: count, label: count === 1 ? 'Winner' : `Top ${count}` }))];
}

function FormSection({ icon, title, description, children }: { icon: ReactNode; title: string; description?: string; children: ReactNode }) {
  return (
    <Panel>
      <div className="p-4 sm:p-6">
        <SectionHeading icon={icon} title={title} description={description} />
        <div className="space-y-5">{children}</div>
      </div>
    </Panel>
  );
}

/** Live preview: how a full field would be seated and how long the tournament runs. */
function StructurePreview({ state }: { state: TournamentFormState }) {
  const settings = formSettings(state);
  const preview = previewStructure(state.format, settings, state.maxEntrants);
  const minimum = minimumEntrants(settings);
  return (
    <div className="rounded-xl border border-amber-800/30 px-3.5 py-3 text-xs sm:text-sm leading-relaxed" style={{ background: INSET_BG }} aria-live="polite">
      {preview.tables ? (
        <p className="text-amber-100/85">
          <span className="font-serif">A full field of {state.maxEntrants}:</span> {describeSeating(preview.tables)} in round 1,{' '}
          {preview.rounds === 1 ? 'one round' : `${preview.rounds} rounds`}
          {state.format === 'knockout' ? ' if every table is played' : ''}.
        </p>
      ) : (
        <p className="text-amber-200">{preview.problem}</p>
      )}
      <p className="mt-1 text-amber-200/45">
        Starts with at least {minimum} players{state.fillWithBots ? ' (bots pad the tables)' : ''}.
      </p>
    </div>
  );
}

function RulesDisclosure({ state, onChange }: { state: TournamentFormState; onChange: (patch: Partial<TournamentFormState>) => void }) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const modified = countNonDefaultRules(state.rulesetConfig);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="w-full min-h-11 flex items-center justify-between gap-3 rounded-xl border border-amber-800/30 px-3.5 py-2.5 text-left transition-colors hover:border-amber-700/50 cursor-pointer"
        style={{ background: INSET_BG }}
      >
        <span>
          <span className="block text-sm text-amber-100 font-serif">
            {modified === 0 ? 'Standard rules' : `${modified} custom rule${modified === 1 ? '' : 's'}`}
          </span>
          <span className="block text-xs text-amber-200/45">Every table of the tournament plays these rules.</span>
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-amber-500/60 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              <RulesetSection rulesetConfig={state.rulesetConfig} onRulesetChange={(rulesetConfig) => onChange({ rulesetConfig })} isHost disabled={false} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export interface TournamentFormProps {
  mode: 'create' | 'edit';
  initial: TournamentFormState;
  /** Edit: the field can't shrink below the players already registered. */
  registeredCount?: number;
  /** Edit: validates the start time only when it was changed. */
  isStartsAtChanged?: (state: TournamentFormState) => boolean;
  submitting: boolean;
  serverError: string | null;
  now: () => number;
  onSubmit: (state: TournamentFormState) => void;
  onCancel: () => void;
}

/** The create / edit form. Validation runs the domain's parsers, exactly like the server. */
export function TournamentForm({ mode, initial, registeredCount = 0, isStartsAtChanged, submitting, serverError, now, onSubmit, onCancel }: TournamentFormProps) {
  const [state, setState] = useState(initial);
  const [touched, setTouched] = useState(false);
  const change = (patch: Partial<TournamentFormState>) => setState((current) => updateFormState(current, patch));
  const errors: TournamentFormErrors = useMemo(
    () => (touched ? validateTournamentForm(state, now(), { startsAtChanged: isStartsAtChanged?.(state) ?? true }) : {}),
    [touched, state, now, isStartsAtChanged]
  );
  const minEntrants = Math.max(TOURNAMENT_LIMITS.MAX_ENTRANTS_LOWER_BOUND, registeredCount);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    const found = validateTournamentForm(state, now(), { startsAtChanged: isStartsAtChanged?.(state) ?? true });
    if (hasFormErrors(found)) return;
    onSubmit(state);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FormSection icon={<Scroll className="w-5 h-5" />} title="The basics">
        <Field
          label="Name"
          value={state.name}
          onChange={(event) => change({ name: event.target.value })}
          maxLength={TOURNAMENT_LIMITS.NAME_MAX_LENGTH}
          placeholder="Spring Cup"
          autoComplete="off"
          error={errors.name}
          required
        />
        <TextArea
          label="Description (optional)"
          value={state.description}
          onChange={(description) => change({ description })}
          maxLength={TOURNAMENT_LIMITS.DESCRIPTION_MAX_LENGTH}
          placeholder="House rules, prizes, when you plan to start…"
          error={errors.description}
        />
      </FormSection>

      <FormSection icon={<Swords className="w-5 h-5" />} title="Format" description="How players meet and who goes through.">
        <Segmented label="Format" layout="cards" value={state.format} options={FORMAT_OPTIONS} onChange={(format) => change({ format })} />
        <Stepper
          label="Players"
          value={state.maxEntrants}
          min={minEntrants}
          max={TOURNAMENT_LIMITS.MAX_ENTRANTS}
          onChange={(maxEntrants) => change({ maxEntrants: Math.max(minEntrants, maxEntrants) })}
          suffix="max"
          hint={registeredCount > TOURNAMENT_LIMITS.MAX_ENTRANTS_LOWER_BOUND ? `${registeredCount} players already registered.` : undefined}
        />
        <Segmented label="Largest table" value={state.maxTableSize} options={TABLE_SIZE_OPTIONS} onChange={(maxTableSize) => change({ maxTableSize })} />
        {state.format === 'series' ? (
          <Stepper label="Rounds" value={state.rounds} min={TOURNAMENT_LIMITS.MIN_ROUNDS} max={TOURNAMENT_LIMITS.MAX_ROUNDS} onChange={(rounds) => change({ rounds })} />
        ) : null}
        {state.format === 'knockout' ? (
          <Segmented label="Advancing per table" value={state.advancePerTable} options={advanceOptions(state.maxTableSize)} onChange={(advancePerTable) => change({ advancePerTable })} />
        ) : null}
        {errors.settings ? <Notice tone="error">{errors.settings}</Notice> : null}
        <StructurePreview state={state} />
      </FormSection>

      <FormSection icon={<Bot className="w-5 h-5" />} title="Bots" description="Bots fill tables that are short of players. They never appear in the standings.">
        <Toggle
          label="Fill tables with bots"
          description="Lets two players start, and seats any field size."
          checked={state.fillWithBots}
          onChange={(fillWithBots) => change({ fillWithBots })}
        />
        {state.fillWithBots ? (
          <Segmented label="Bot strength" value={state.botDifficulty} options={BOT_DIFFICULTY_OPTIONS} onChange={(botDifficulty) => change({ botDifficulty })} />
        ) : null}
      </FormSection>

      <FormSection icon={<CalendarClock className="w-5 h-5" />} title="Schedule and access">
        <Toggle
          label="Schedule a start time"
          description="The tournament starts by itself then, if enough players registered. You can always start earlier."
          checked={state.scheduled}
          onChange={(scheduled) => change({ scheduled })}
        />
        {state.scheduled ? (
          <div>
            <FieldLabel htmlFor="tournament-starts-at">Starts at (your local time)</FieldLabel>
            <input
              id="tournament-starts-at"
              type="datetime-local"
              value={state.startsAtLocal}
              onChange={(event) => change({ startsAtLocal: event.target.value })}
              aria-invalid={errors.startsAt ? true : undefined}
              aria-describedby="tournament-starts-at-message"
              className="wp-field w-full min-h-11 px-4 py-2.5 rounded-xl border border-amber-700/25 focus:outline-none focus:border-amber-500/60 text-amber-50 text-base sm:text-sm aria-[invalid=true]:border-red-700/60 [color-scheme:dark]"
              style={{ background: FIELD_BG }}
            />
            <FieldMessage id="tournament-starts-at-message" error={errors.startsAt} />
          </div>
        ) : null}
        <Segmented label="Visibility" layout="cards" value={state.visibility} options={VISIBILITY_OPTIONS} onChange={(visibility) => change({ visibility })} />
        <RulesDisclosure state={state} onChange={change} />
        {mode === 'create' ? (
          <Toggle
            label="I'm playing too"
            description="Register yourself right away. Hosts can also just run the tournament."
            checked={state.joinAsEntrant}
            onChange={(joinAsEntrant) => change({ joinAsEntrant })}
          />
        ) : null}
      </FormSection>

      {serverError ? <Notice tone="error">{serverError}</Notice> : null}
      {touched && hasFormErrors(errors) ? <Notice tone="warning">Please fix the highlighted fields.</Notice> : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={submitting}>
          {mode === 'create' ? 'Create tournament' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
