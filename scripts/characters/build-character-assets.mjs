#!/usr/bin/env node
/**
 * Builds the character assets in public/characters/ from the KayKit Adventurers pack (CC0) and our
 * own familiars (familiars.mjs):
 *
 *   characters.glb            one rig with every catalog part on it, each node named by part id
 *                             (`head:mage`, `outfit:knight/2`, …); the game shows the chosen ones
 *   character-animations.glb  the same rig without meshes and the clips listed in the manifest
 *
 * Inputs are pinned in kaykit-source.json (commit and SHA-256 per file) and cached in
 * node_modules/.cache/kaykit. Run `npm run characters:build` after changing the manifest; the
 * outputs are committed, so builds and deploys never fetch anything.
 */
/* eslint-disable no-await-in-loop -- files are read and written one at a time to keep memory low */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, mergeDocuments, meshopt, prune, resample, unpartition } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { Quaternion, Vector3 } from 'three';

import { FAMILIAR_PLACEMENT, buildFamiliarGeometries } from './familiars.mjs';

const SOURCE = JSON.parse(await readFile(new URL('./kaykit-source.json', import.meta.url), 'utf8'));
const CACHE = new URL('../../node_modules/.cache/kaykit/', import.meta.url);
const OUT = new URL('../../public/characters/', import.meta.url);
/** Prefix for nodes of the non-rig files while they are merged; none of them survives. */
const FOREIGN = '__';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function fetchVerified(name) {
  const { sha256: expected } = SOURCE.files[name];
  const cached = new URL(`${name}.glb`, CACHE);
  try {
    const bytes = await readFile(cached);
    if (sha256(bytes) === expected) return bytes;
  } catch {
    // Not cached yet.
  }
  const url = `https://raw.githubusercontent.com/${SOURCE.repository}/${SOURCE.commit}/${SOURCE.directory}/${name}.glb`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const actual = sha256(bytes);
  if (actual !== expected) throw new Error(`${name}.glb: SHA-256 ${actual}, expected ${expected}`);
  await mkdir(CACHE, { recursive: true });
  await writeFile(cached, bytes);
  return bytes;
}

function nodesByName(document) {
  return new Map(document.getRoot().listNodes().map((node) => [node.getName(), node]));
}

/** Samplers hold the keyframe accessors; disposing only the animation would leave them in. */
function disposeAnimation(animation) {
  for (const channel of animation.listChannels()) channel.dispose();
  for (const sampler of animation.listSamplers()) sampler.dispose();
  animation.dispose();
}

/** Keeps and renames this file's catalog parts, drops every other mesh and all animations. */
function preparePartsDocument(document, file) {
  const root = document.getRoot();
  for (const animation of root.listAnimations()) disposeAnimation(animation);
  const byName = nodesByName(document);
  const kept = new Set();
  for (const [partId, part] of Object.entries(SOURCE.parts)) {
    if (part.file !== file) continue;
    part.nodes.forEach((nodeName, index) => {
      const node = byName.get(nodeName);
      if (!node?.getMesh()) throw new Error(`${file}.glb has no mesh node ${nodeName} for ${partId}`);
      node.setName(part.nodes.length === 1 ? partId : `${partId}/${index}`).setExtras({ part: partId });
      kept.add(node);
    });
  }
  for (const node of root.listNodes()) {
    if (node.getMesh() && !kept.has(node)) node.dispose();
    else if (!kept.has(node) && file !== SOURCE.rigFile) node.setName(`${FOREIGN}${file}:${node.getName()}`);
  }
}

const canonicalName = (name) => (name.startsWith(FOREIGN) ? name.slice(name.indexOf(':') + 1) : name);

/** Binds the parts of the merged files to the rig file's bones and removes their own rigs. */
function adoptForeignParts(document) {
  const root = document.getRoot();
  const rig = new Map(root.listNodes().filter((node) => !node.getName().startsWith(FOREIGN) && !node.getExtras().part).map((node) => [node.getName(), node]));
  const bone = (name) => {
    const node = rig.get(canonicalName(name));
    if (!node) throw new Error(`rig has no node ${canonicalName(name)}`);
    return node;
  };
  for (const node of root.listNodes().filter((candidate) => candidate.getExtras().part)) {
    const skin = node.getSkin();
    if (skin && skin.listJoints().some((joint) => joint.getName().startsWith(FOREIGN))) {
      const joints = skin.listJoints();
      joints.forEach((joint) => skin.removeJoint(joint));
      joints.forEach((joint) => skin.addJoint(bone(joint.getName())));
      const skeleton = skin.getSkeleton();
      if (skeleton) skin.setSkeleton(bone(skeleton.getName()));
    }
    const parent = node.getParentNode();
    if (parent?.getName().startsWith(FOREIGN)) bone(parent.getName()).addChild(node);
  }
  for (const node of root.listNodes()) if (node.getName().startsWith(FOREIGN)) node.dispose();
  const [scene, ...others] = root.listScenes();
  for (const extra of others) extra.dispose();
  root.setDefaultScene(scene);
}

/** Adds each familiar as a vertex-coloured mesh on the rig, tagged with its part id like the rest. */
function addFamiliars(document) {
  const root = document.getRoot();
  const buffer = root.listBuffers()[0];
  const anchor = root.listNodes().find((node) => node.getName() === FAMILIAR_PLACEMENT.bone);
  if (!anchor) throw new Error(`rig has no node ${FAMILIAR_PLACEMENT.bone}`);
  const material = document.createMaterial('familiar').setBaseColorFactor([1, 1, 1, 1]).setMetallicFactor(0).setRoughnessFactor(0.85);
  const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), FAMILIAR_PLACEMENT.turnY).toArray();
  const accessor = (attribute) => document.createAccessor().setArray(attribute.array).setType('VEC3').setBuffer(buffer);
  for (const { partId, geometry } of buildFamiliarGeometries()) {
    const primitive = document.createPrimitive()
      .setAttribute('POSITION', accessor(geometry.attributes.position))
      .setAttribute('NORMAL', accessor(geometry.attributes.normal))
      .setAttribute('COLOR_0', accessor(geometry.attributes.color))
      .setMaterial(material);
    const node = document.createNode(partId)
      .setMesh(document.createMesh(partId).addPrimitive(primitive))
      .setExtras({ part: partId })
      .setTranslation(FAMILIAR_PLACEMENT.position)
      .setRotation(turn);
    anchor.addChild(node);
    geometry.dispose();
  }
}

async function buildCharacters(io) {
  const files = Object.keys(SOURCE.files);
  const documents = new Map();
  for (const file of files) {
    const document = await io.readBinary(await fetchVerified(file));
    preparePartsDocument(document, file);
    documents.set(file, document);
  }
  const target = documents.get(SOURCE.rigFile);
  for (const [file, document] of documents) if (file !== SOURCE.rigFile) mergeDocuments(target, document);
  adoptForeignParts(target);
  await target.transform(unpartition());
  addFamiliars(target);
  await target.transform( prune(), dedup(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  return target;
}

async function buildAnimations(io) {
  const document = await io.readBinary(await fetchVerified(SOURCE.rigFile));
  const root = document.getRoot();
  const wanted = new Set(SOURCE.clips);
  const missing = SOURCE.clips.filter((clip) => !root.listAnimations().some((animation) => animation.getName() === clip));
  if (missing.length > 0) throw new Error(`${SOURCE.rigFile}.glb lacks clips: ${missing.join(', ')}`);
  for (const animation of root.listAnimations()) if (!wanted.has(animation.getName())) disposeAnimation(animation);
  for (const node of root.listNodes()) if (node.getMesh()) node.dispose();
  await document.transform(resample());
  const dropped = dropRestPoseChannels(document);
  await document.transform(prune(), dedup(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  process.stdout.write(`character-animations: dropped ${dropped} channels that never leave the rest pose
`);
  return document;
}

const REST_POSE_EPSILON = 1e-5;
const REST_POSE = { translation: (node) => node.getTranslation(), rotation: (node) => node.getRotation(), scale: (node) => node.getScale() };

/** A channel whose every keyframe equals the bone's rest value animates nothing. */
function dropRestPoseChannels(document) {
  let dropped = 0;
  for (const animation of document.getRoot().listAnimations()) {
    for (const channel of animation.listChannels()) {
      const node = channel.getTargetNode();
      const rest = node && REST_POSE[channel.getTargetPath()]?.(node);
      const values = channel.getSampler()?.getOutput()?.getArray();
      if (!rest || !values) continue;
      const still = values.every((value, index) => Math.abs(value - rest[index % rest.length]) < REST_POSE_EPSILON);
      if (!still) continue;
      const sampler = channel.getSampler();
      channel.dispose();
      if (sampler && !animation.listChannels().some((other) => other.getSampler() === sampler)) sampler.dispose();
      dropped += 1;
    }
  }
  return dropped;
}

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

await mkdir(OUT, { recursive: true });
for (const [name, build] of [['characters.glb', buildCharacters], ['character-animations.glb', buildAnimations]]) {
  const bytes = await io.writeBinary(await build(io));
  await writeFile(new URL(name, OUT), bytes);
  process.stdout.write(`public/characters/${name}: ${(bytes.byteLength / 1024).toFixed(0)} KB
`);
}
