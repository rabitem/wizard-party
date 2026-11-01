'use client';

import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  CHARACTER_PARTS,
  CHARACTER_SLOTS,
  DEFAULT_APPEARANCE,
  validateAppearance,
  type CharacterAppearance,
  type CharacterSlot,
} from '@shared/domain/character';

import { CharacterFigure } from '@/presentation/components/character';
import { CHARACTER_CLIPS, type CharacterClip } from '@/presentation/config/character.config';

/** Slots the 3D model shows; palettes and familiars arrive with their own assets. */
const MODEL_SLOTS: readonly CharacterSlot[] = CHARACTER_SLOTS.filter((slot) => slot !== 'palette' && slot !== 'familiar');
const CAMERA = { position: [0, 1.6, 7] as [number, number, number], fov: 35 };
const TARGET: [number, number, number] = [0, 1.35, 0];

function SlotPicker({ slot, value, onChange }: { slot: CharacterSlot; value: string; onChange: (id: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-amber-200/80">
      {slot}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded border border-amber-800/40 bg-black/40 px-2 py-1 text-amber-100">
        {CHARACTER_PARTS.filter((part) => part.slot === slot).map((part) => (
          <option key={part.id} value={part.id}>{part.name}</option>
        ))}
      </select>
    </label>
  );
}

/** Dev page: try every part and clip on the real assets (no accounts, no unlocks). */
export function CharacterViewer() {
  const [appearance, setAppearance] = useState<CharacterAppearance>(DEFAULT_APPEARANCE);
  const [clip, setClip] = useState<CharacterClip>(CHARACTER_CLIPS.IDLE);
  const problem = validateAppearance(appearance);

  return (
    <main className="min-h-dvh grid md:grid-cols-[18rem_1fr] bg-[var(--page-base)] text-amber-100">
      <aside className="flex flex-col gap-3 p-4 border-b md:border-b-0 md:border-r border-amber-900/40">
        <h1 className="text-lg" style={{ fontFamily: 'Georgia, serif' }}>Characters</h1>
        {MODEL_SLOTS.map((slot) => (
          <SlotPicker key={slot} slot={slot} value={appearance[slot]} onChange={(id) => setAppearance((current) => ({ ...current, [slot]: id }))} />
        ))}
        <label className="flex flex-col gap-1 text-xs text-amber-200/80">
          clip
          <select value={clip} onChange={(event) => setClip(event.target.value as CharacterClip)} className="rounded border border-amber-800/40 bg-black/40 px-2 py-1 text-amber-100">
            {Object.values(CHARACTER_CLIPS).map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <p role="status" className={`text-xs ${problem ? 'text-red-300' : 'text-emerald-300/80'}`}>{problem ?? 'valid combination'}</p>
      </aside>
      <div className="h-[70dvh] md:h-dvh" data-testid="character-canvas">
        <Canvas camera={CAMERA} dpr={[1, 2]}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[2, 4, 3]} intensity={1.6} />
          <Suspense fallback={null}>
            <CharacterFigure appearance={appearance} clip={clip} />
          </Suspense>
          <OrbitControls target={TARGET} enablePan={false} />
        </Canvas>
      </div>
    </main>
  );
}
