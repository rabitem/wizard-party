#!/usr/bin/env node
/**
 * Synthesizes the bundled sound effects in public/sounds/ with ffmpeg. Every clip comes from a
 * design in scripts/lib/sound-designs-*.mjs, so the output is original, reproducible and covered
 * by the project licence. Each design renders to raw PCM, is normalised to a common loudness and
 * encoded as mono 44.1 kHz 96 kbps MP3.
 *
 * Usage: npm run sounds:generate [-- name ...]   (FFmpeg 7.0 or newer with libmp3lame must be on PATH)
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JESTER_DESIGNS } from './lib/sound-designs-jester.mjs';
import { GAME_WIN_DESIGNS, ROUND_WIN_DESIGNS, TRICK_WIN_DESIGNS } from './lib/sound-designs-wins.mjs';
import { WIZARD_DESIGNS } from './lib/sound-designs-wizard.mjs';
import { SAMPLE_RATE, num } from './lib/sound-synth.mjs';

const OUT_DIR = fileURLToPath(new URL('../public/sounds/', import.meta.url));
const DESIGNS = [...WIZARD_DESIGNS, ...JESTER_DESIGNS, ...TRICK_WIN_DESIGNS, ...ROUND_WIN_DESIGNS, ...GAME_WIN_DESIGNS];

// Loudness is measured on the loudest 300 ms window so short hits and long swells sound alike.
const TARGET_WINDOW_RMS_DB = -14;
const PEAK_CEILING_DB = -1.5;
const WINDOW_SECONDS = 0.3;
const FADE_OUT_SECONDS = 0.04;
// `-/filter_complex <file>` (filter graph read from a file) needs FFmpeg 7.0.
const MIN_FFMPEG_MAJOR = 7;

function ffmpeg(args, input) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], {
    input,
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error?.code === 'ENOENT') throw new Error('ffmpeg was not found on PATH');
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.toString());
  return result.stdout;
}

function assertFfmpegVersion() {
  const banner = ffmpeg(['-version']).toString();
  // Git snapshot builds report a date or commit instead of a release number; let those through.
  const [, version, major] = /^ffmpeg version (n?(\d+)\.\S*)/.exec(banner) ?? [];
  if (major !== undefined && Number(major) < MIN_FFMPEG_MAJOR) {
    throw new Error(`FFmpeg ${MIN_FFMPEG_MAJOR}.0 or newer is required (found ${version})`);
  }
}

function buildGraph({ dur, layers, post = [] }) {
  const flat = layers.flat(Infinity);
  const chains = flat.map((layer, index) => {
    const steps = [
      `aevalsrc=exprs='${layer.expr}':s=${SAMPLE_RATE}:d=${num(layer.dur)}`,
      ...layer.filters,
      `volume=${num(layer.gain)}`,
    ];
    if (layer.at > 0) steps.push(`adelay=delays=${Math.round(layer.at * SAMPLE_RATE)}S:all=1`);
    return `${steps.join(',')}[l${index}]`;
  });
  const mix = [
    `amix=inputs=${flat.length}:normalize=0:duration=longest`,
    'highpass=f=30',
    `apad=whole_dur=${num(dur)}`,
    ...post,
    `atrim=0:${num(dur)}`,
    'afade=t=in:d=0.003',
    `afade=t=out:st=${num(dur - FADE_OUT_SECONDS)}:d=${num(FADE_OUT_SECONDS)}`,
  ];
  return [...chains, `${flat.map((_, index) => `[l${index}]`).join('')}${mix.join(',')}`].join(';\n');
}

function render(design, workDir) {
  const graphFile = join(workDir, `${design.name}.graph`);
  writeFileSync(graphFile, buildGraph(design));
  const raw = ffmpeg(['-/filter_complex', graphFile, '-f', 'f32le', '-ac', '1', '-ar', String(SAMPLE_RATE), 'pipe:1']);
  return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
}

function loudestWindowRms(samples) {
  const size = Math.min(samples.length, Math.round(WINDOW_SECONDS * SAMPLE_RATE));
  const hop = Math.max(1, Math.floor(size / 4));
  let loudest = 0;
  for (let start = 0; start + size <= samples.length; start += hop) {
    let sum = 0;
    for (let index = start; index < start + size; index++) sum += samples[index] * samples[index];
    loudest = Math.max(loudest, Math.sqrt(sum / size));
  }
  return loudest;
}

function normalise(samples, levelDb = 0) {
  const peak = samples.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
  const rms = loudestWindowRms(samples);
  if (peak === 0 || rms === 0) throw new Error('rendered silence');
  const gain = Math.min(10 ** ((TARGET_WINDOW_RMS_DB + levelDb) / 20) / rms, 10 ** (PEAK_CEILING_DB / 20) / peak);
  return samples.map((sample) => sample * gain);
}

function encode(samples, outFile) {
  ffmpeg([
    '-f', 'f32le', '-ar', String(SAMPLE_RATE), '-ac', '1', '-i', 'pipe:0',
    '-c:a', 'libmp3lame', '-b:a', '96k', '-ac', '1', '-ar', String(SAMPLE_RATE),
    '-map_metadata', '-1', '-id3v2_version', '0', '-fflags', '+bitexact', '-flags:a', '+bitexact',
    '-y', outFile,
  ], Buffer.from(samples.buffer));
}

function selectDesigns(names) {
  const unknown = names.filter((name) => !DESIGNS.some((design) => design.name === name));
  if (unknown.length > 0) throw new Error(`Unknown sound(s): ${unknown.join(', ')}`);
  return names.length > 0 ? DESIGNS.filter((design) => names.includes(design.name)) : DESIGNS;
}

assertFfmpegVersion();
const workDir = mkdtempSync(join(tmpdir(), 'wizard-party-sounds-'));
try {
  for (const design of selectDesigns(process.argv.slice(2))) {
    const outFile = join(OUT_DIR, `${design.name}.mp3`);
    encode(normalise(render(design, workDir), design.level), outFile);
    process.stdout.write(`${design.name}.mp3  ${design.dur}s  ${(statSync(outFile).size / 1024).toFixed(1)} KiB\n`);
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
