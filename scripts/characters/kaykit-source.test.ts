import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { CHARACTER_PARTS } from '../../shared/domain/character';
import source from './kaykit-source.json';

/** Parts with nothing to draw (`…:none`), and familiars, which are our own models. */
const needsKayKitModel = (id: string, slot: string) => !id.endsWith(':none') && slot !== 'familiar' && slot !== 'palette';

function glbNodeNames(path: string): string[] {
  const bytes = readFileSync(new URL(path, import.meta.url));
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8')) as { nodes: { name?: string }[]; animations?: { name: string }[] };
  return json.nodes.map((node) => node.name ?? '');
}

describe('KayKit character source', () => {
  it('should map every drawable catalog part to a model, and nothing else', () => {
    const expected = CHARACTER_PARTS.filter((part) => needsKayKitModel(part.id, part.slot)).map((part) => part.id).sort();
    expect(Object.keys(source.parts).sort()).toEqual(expected);
  });

  it('should only read files it pins with a checksum', () => {
    const pinned = new Set(Object.keys(source.files));
    const unpinned = [source.rigFile, ...Object.values(source.parts).map((part) => part.file)].filter((file) => !pinned.has(file));
    expect(unpinned).toEqual([]);
    expect(Object.values(source.files).every((file) => /^[0-9a-f]{64}$/.test(file.sha256))).toBe(true);
  });

  it('should have built public/characters/characters.glb from the current manifest', () => {
    const builtParts = new Set(glbNodeNames('../../public/characters/characters.glb').map((name) => name.split('/')[0]));
    expect(Object.keys(source.parts).filter((partId) => !builtParts.has(partId))).toEqual([]);
  });
});
